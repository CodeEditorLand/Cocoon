/*---------------------------------------------------------------------------------------------
 * Cocoon Configuration Shim (configuration-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.workspace.getConfiguration` API, allowing extensions to access
 * configuration settings. This shim acts as the ExtHost-side representation of the
 * configuration service, fulfilling the `IExtHostConfiguration` interface.
 *
 * It maintains an internal cache of the current effective configuration state. This cache
 * is initialized from data provided by Mountain (`initData`) and is kept up-to-date
 * through RPC calls from Mountain (e.g., `$initializeConfiguration`, `$acceptConfigurationChanged`)
 * or, alternatively, via direct IPC events (`ipc.onConfigurationChanged`).
 *
 * When an extension calls `vscode.workspace.getConfiguration(section?, scope?)`, this service:
 * - Fetches the relevant configuration values from Mountain via RPC if a proxy is available.
 * - Returns a `vscode.WorkspaceConfiguration` object (implemented by an internal class
 *   `ShimWorkspaceConfigurationImpl`, though created dynamically here).
 *
 * The returned `WorkspaceConfiguration` object:
 * - Implements methods like `get()`, `has()`, `inspect()`, and `update()`.
 * - For `get()` and `has()`, it reads from a snapshot of the configuration values
 *   obtained for the specified section and scope.
 * - For `inspect()` and `update()`, it proxies these operations to the
 *   `MainThreadConfiguration` service on Mountain via RPC calls.
 *
 * This shim also handles the `vscode.workspace.onDidChangeConfiguration` event, firing it
 * when configuration changes are received from Mountain. Additionally, it provides a
 * `getConfigProvider()` method used by the `NodeRequireInterceptor` (specifically
 * `VSCodeNodeModuleFactory`) when an extension executes `require('vscode')`.
 *
 * Key Interactions:
 * - An instance of `ShimExtHostConfiguration` is registered with Dependency Injection (DI)
 *   in `Cocoon/index.ts` as `IExtHostConfiguration`.
 * - The `vscode.workspace.getConfiguration` method and `onDidChangeConfiguration` event,
 *
 *   as exposed to extensions via the API factory, delegate their functionality to this service.
 * - Communicates with `MainContext.MainThreadConfiguration` on Mountain via RPC for
 *   fetching, inspecting, and updating configurations.
 * - Can receive configuration updates via direct IPC (`ipc.onConfigurationChanged`) as an
 *   alternative or supplement to RPC-pushed updates from Mountain.
 * - Uses `BaseCocoonShim` for common utilities like logging, RPC proxy management, and
 *   argument marshalling/revival.
 *
 *--------------------------------------------------------------------------------------------*/

// Node.js EventEmitter for onDidChangeConfiguration
import { EventEmitter } from "events";
import type { Event as VscodeEvent } from "vs/base/common/event";
// For getConfigProvider parameter
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions";
import {
	// Protocol DTO for configuration target (e.g., UserLocal, Workspace)
	ConfigurationTargetDto,
	// For registering this service for RPC calls from MainThread
	ExtHostContext,
	// For proxying to MainThreadConfiguration on Mountain
	MainContext,
	// Protocol DTO for configuration change details
	type IConfigurationChange,
	// Protocol DTO for initial configuration data
	type IConfigurationInitData,
	// Protocol DTO for scope overrides (resource URI, languageId)
	type IConfigurationOverridesDto,
	// RPC shape this service implements for MainThread calls
	type ExtHostConfigurationShape as VscodeExtHostConfigurationShape,
} from "vs/workbench/api/common/extHost.protocol";

// For direct IPC subscription to configuration changes from Mountain
import * as ipc from "../cocoon-ipc";
import {
	// Public API enum (User, Global, Workspace, WorkspaceFolder)
	ConfigurationTarget as VscodeConfigurationTarget,
	// Public API URI type
	Uri as VscodeUri,
	type ConfigurationChangeEvent as VscodeConfigurationChangeEvent,
	type WorkspaceConfiguration as VscodeWorkspaceConfiguration,
} from "../Shim/out/vscode";
// Public vscode API types
import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Type Definitions ---

/**
 * Defines the RPC interface for the `MainThreadConfiguration` service expected on Mountain.
 * Methods and parameters must align with Mountain's implementation.
 */
interface MainThreadConfigurationProxyShape {
	/**
	 * Fetches configuration values from the main thread.
	 * @param args A tuple: `[section: string | null, overridesDto: IConfigurationOverridesDto | null, scopeToLanguage: boolean | undefined]`
	 *             - `section`: The configuration section (e.g., "editor.fontSize"). Null for all.
	 *             - `overridesDto`: Scope overrides (resource URI, language ID).
	 *             - `scopeToLanguage`: VS Code internal flag, often true if only languageId is provided in scope.
	 * @returns A promise resolving to the configuration values for the specified section and scope.
	 */
	$getConfiguration(
		args: [
			string | null,

			IConfigurationOverridesDto | null,

			boolean | undefined,
		],
	): Promise<any>;

	/**
	 * Inspects configuration keys on the main thread.
	 * @param args A tuple: `[keys: string[]]`
	 *             - `keys`: An array of full configuration keys to inspect (e.g., ["editor.fontSize", "files.autoSave"]).
	 * @returns A promise resolving to a map where keys are the inspected configuration keys and values
	 *          are their inspection details (DTO compatible with `vscode.ConfigurationInspect<T>`).
	 */
	$inspect(
		args: [string[]],
	): Promise<{ [key: string]: any /* IConfigurationInspect<any> DTO */ }>;

	/**
	 * Updates a configuration option on the main thread.
	 * @param args A tuple: `[targetDto, key, value, overridesDto, scopeToLanguage]`
	 *             - `targetDto`: The `ConfigurationTargetDto` (UserLocal, Workspace, WorkspaceFolder).
	 *             - `key`: The full configuration key to update.
	 *             - `value`: The new value to set. `undefined` typically means delete the key.
	 *             - `overridesDto`: Scope overrides for the update.
	 *             - `scopeToLanguage`: VS Code internal flag.
	 * @returns A promise that resolves when the update is complete or rejects on error.
	 */
	$updateConfigurationOption(
		args: [
			ConfigurationTargetDto | null | undefined,

			string,

			any,

			IConfigurationOverridesDto | null,

			boolean | undefined,
		],
	): Promise<void>;
}

/** Payload from Mountain's direct IPC notification (`$acceptConfigurationChanged` via IPC) for new config snapshot. */
interface MountainConfigNotificationPayload {
	// The new full effective configuration object.
	values: any;
}

/** Payload from Mountain's direct IPC notification for configuration change details. */
interface MountainConfigChangeDetails {
	// Array of top-level configuration keys that changed.
	keys: string[];

	// Array of [identifier, keys[]], where identifier is URI string or language ID.
	overrides: [string, string[]][];
}

/** Represents the scope parameter for `vscode.workspace.getConfiguration`. */
type VscodeConfigurationScope =
	| VscodeUri
	| { uri?: VscodeUri; languageId?: string }
	| null
	| undefined;

/**
 * Cocoon's implementation of `IExtHostConfiguration` (and `VscodeExtHostConfigurationShape` for RPC).
 * Manages extension access to configuration settings, caching them locally and synchronizing with Mountain.
 */
export class ShimExtHostConfiguration
	extends BaseCocoonShim
	implements VscodeExtHostConfigurationShape
{
	// Required by VS Code's service types for DI
	public readonly _serviceBrand: undefined;

	#mainThreadConfigurationProxy: MainThreadConfigurationProxyShape | null =
		null;

	// Cache of the latest full effective configuration values.
	#currentConfigurationState: any = {};

	// Node.js EventEmitter for the public `onDidChangeConfiguration` event.
	readonly #onDidChangeConfigurationEmitter = new EventEmitter();

	/**
	 * Creates an instance of ShimExtHostConfiguration.
	 * @param rpcService The RPC service adapter for communication with MainThreadConfiguration.
	 * @param configurationInitData Initial configuration data (e.g., `revivedInitData.configurationData.effective`) from Mountain.
	 * @param logService The logging service instance.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		// From ExtHostInitData.configurationData
		configurationInitData: IConfigurationInitData | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostConfiguration", rpcService, logService);

		// Use Info for major lifecycle
		this._logInfo("Initializing...");

		if (configurationInitData?.effective) {
			// Deep clone the initial configuration to prevent external modification.
			this.#currentConfigurationState = JSON.parse(
				JSON.stringify(configurationInitData.effective),
			);

			this._logInfo(
				"Initial configuration cache populated from initData.configurationData.effective.",
			);
		} else {
			this._logWarn(
				"No initial configuration data (initData.configurationData.effective) was provided. Cache starts empty. Expecting an $initializeConfiguration RPC call from Mountain.",
			);
		}

		if (this._rpcService) {
			this.#mainThreadConfigurationProxy = this._getProxy(
				MainContext.MainThreadConfiguration as ProxyIdentifier<MainThreadConfigurationProxyShape>,
			);

			if (this.#mainThreadConfigurationProxy) {
				this._logInfo(
					"MainThreadConfiguration RPC proxy obtained successfully.",
				);
			} else {
				this._logError(
					"Failed to obtain MainThreadConfiguration RPC proxy. Configuration features (fetch, inspect, update) will be severely impaired or non-functional.",
				);
			}

			// Register self to handle RPC calls from MainThreadConfiguration (e.g., $initializeConfiguration, $acceptConfigurationChanged).
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostConfiguration as ProxyIdentifier<VscodeExtHostConfigurationShape>,

					this,
				);

				this._logInfo(
					"Registered self for RPC calls from MainThread (ExtHostConfiguration).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to register self as RPC target for ExtHostConfiguration:",

					e,
				);
			}
		} else {
			this._logError(
				"RPCService Adapter (IRpcProtocolServiceAdapter) is unavailable. Cannot proxy to MainThreadConfiguration or receive RPC updates for configuration.",
			);
		}

		// Subscribe to direct IPC configuration change events from Mountain as an alternative update mechanism.
		this._instanceDisposables.add(
			ipc.onConfigurationChanged(
				([newConfigPayload, changeDetails]: [
					MountainConfigNotificationPayload | null,

					MountainConfigChangeDetails | undefined,
				]) => {
					if (
						!newConfigPayload ||
						typeof newConfigPayload.values !== "object"
					) {
						this._logError(
							"IPC $acceptConfigurationChanged: Invalid or missing newConfigPayload.values received.",

							newConfigPayload,
						);

						return;
					}

					const affectedKeysSummary =
						changeDetails?.keys?.join(", ") ?? "N/A";

					this._logDebug(
						`IPC $acceptConfigurationChanged received. Updating cache. Affected top-level keys from details: [${affectedKeysSummary}]`,
					);

					this.#currentConfigurationState = JSON.parse(
						JSON.stringify(newConfigPayload.values),

						// Deep clone
					);

					const affectedKeysForEvent = new Set<string>(
						changeDetails?.keys || [],
					);

					changeDetails?.overrides?.forEach(
						([_identifier, overrideKeys]) => {
							overrideKeys.forEach((key) =>
								affectedKeysForEvent.add(key),
							);
						},
					);

					const eventArg: VscodeConfigurationChangeEvent = {
						affectsConfiguration: (
							section: string,

							scope?: VscodeUri,
						): boolean => {
							if (scope) {
								// Scope checking for IPC-triggered changes might be less precise than RPC-triggered ones
								// if Mountain's IPC notification doesn't provide full override details.
								this._logWarnOnce(
									`ConfigurationChangeEvent.affectsConfiguration with scope checking for IPC-triggered changes. Scope: ${scope.toString()}. This check might be less precise if detailed override info isn't available via IPC.`,
								);
							}

							// An empty section string means any change affects it.
							if (!section) return true;

							for (const key of affectedKeysForEvent) {
								if (
									key === section ||
									key.startsWith(section + ".")
								)
									return true;
							}

							return false;
						},
					};

					this.#onDidChangeConfigurationEmitter.emit(
						"fire",

						Object.freeze(eventArg),

						// Ensure event arg is immutable
					);

					this._logInfo(
						"Fired public onDidChangeConfiguration event due to direct IPC update.",
					);
				},
			),
		);

		this._logInfo(
			"Subscribed to direct IPC configuration change events from Mountain ('onConfigurationChanged').",
		);
	}

	// --- VscodeExtHostConfigurationShape Methods (called by MainThread via RPC) ---

	/**
	 * {@inheritDoc VscodeExtHostConfigurationShape.$initializeConfiguration}
	 *
	 * Initializes or re-initializes the configuration cache with data from the main thread.
	 * This is typically called once during extension host startup.
	 * @param data The initial configuration data, including all effective values.
	 */
	public $initializeConfiguration(data: IConfigurationInitData): void {
		this._logInfo(
			`RPC $initializeConfiguration received. Effective keys count: ${Object.keys(data.effective || {}).length}`,
		);

		this.#currentConfigurationState = JSON.parse(
			JSON.stringify(data.effective || {}),

			// Deep clone
		);

		this._logInfo(
			"Configuration cache (re)initialized via $initializeConfiguration RPC from MainThread.",
		);

		// Per VS Code behavior, an onDidChangeConfiguration event is typically NOT fired for the initial load,

		// as extensions expect to get the current state on their first `getConfiguration` call.
	}

	/**
	 * {@inheritDoc VscodeExtHostConfigurationShape.$acceptConfigurationChanged}
	 *
	 * Accepts configuration changes pushed from the main thread and updates the local cache.
	 * This method fires the `onDidChangeConfiguration` event to notify extensions.
	 * @param data The new full configuration data (containing the latest `effective` values).
	 * @param change Details about what keys and scopes changed, used by `affectsConfiguration`.
	 */
	public $acceptConfigurationChanged(
		data: IConfigurationInitData,

		change: IConfigurationChange,
	): void {
		const changedKeysSummary = change.keys.join(", ");

		const overridesAffectedCount = change.overrides?.length ?? 0;

		this._logInfo(
			`RPC $acceptConfigurationChanged received. Changed top-level keys: [${changedKeysSummary}], Overrides affected: ${overridesAffectedCount}`,
		);

		this.#currentConfigurationState = JSON.parse(
			JSON.stringify(data.effective || {}),

			// Update cache with new effective config
		);

		const eventArg: VscodeConfigurationChangeEvent = {
			affectsConfiguration: (
				section: string,

				scope?: VscodeUri,
			): boolean => {
				// An empty section string implies any change affects it.
				if (!section) return true;

				// Check if any of the directly changed top-level keys affect the given section.
				for (const key of change.keys) {
					if (key === section || key.startsWith(section + "."))
						return true;
				}

				// Check if any changes within language-specific or resource-specific overrides affect the section.
				if (change.overrides) {
					for (const override of change.overrides) {
						// An override change applies if its identifier (URI string or language ID) matches the queried scope,

						// or if no scope is provided (meaning check against all overrides).
						const scopeIdentifier = scope
							? scope.languageId || scope.toString()
							: undefined;

						if (
							scopeIdentifier &&
							!override.identifiers.includes(scopeIdentifier)
						) {
							// This particular override change doesn't apply to the queried scope.
							continue;
						}

						// If the override applies to the scope (or if scope is undefined, meaning consider all overrides),

						// check if any of its changed keys affect the given section.
						for (const key of override.keys) {
							if (
								key === section ||
								key.startsWith(section + ".")
							)
								return true;
						}
					}
				}

				return false;
			},
		};

		this.#onDidChangeConfigurationEmitter.emit(
			"fire",

			Object.freeze(eventArg),

			// Ensure event arg is immutable
		);

		this._logInfo(
			"Fired public onDidChangeConfiguration event due to RPC update ($acceptConfigurationChanged).",
		);
	}

	// --- vscode.workspace.getConfiguration API Implementation ---

	/**
	 * {@inheritDoc vscode.workspace.getConfiguration}
	 *
	 * Gets a workspace configuration object for a given section and scope.
	 * @param section Optional configuration section (e.g., "editor"). If undefined, returns the root configuration.
	 * @param scope Optional scope (resource URI or language ID) for which to get the configuration.
	 * @returns A promise resolving to a `vscode.WorkspaceConfiguration` instance.
	 */
	public async getConfiguration(
		section?: string,

		scope?: VscodeConfigurationScope,
	): Promise<VscodeWorkspaceConfiguration> {
		let resourceFromScope: VscodeUri | undefined = undefined;

		let languageIdFromScope: string | undefined = undefined;

		if (scope instanceof VscodeUri) {
			resourceFromScope = scope;
		} else if (
			scope &&
			typeof scope === "object" &&
			(scope.uri || scope.languageId)
		) {
			resourceFromScope = scope.uri;

			languageIdFromScope = scope.languageId;
		}

		const scopeForLog = resourceFromScope
			? resourceFromScope.toString()
			: languageIdFromScope || "global";

		this._logDebug(
			`API getConfiguration: Section='${section || "(root)"}', Scope='${scopeForLog}'`,
		);

		if (!this.#mainThreadConfigurationProxy) {
			this._logError(
				"Cannot getConfiguration: MainThreadConfiguration RPC proxy unavailable. Using potentially stale local cache.",
			);

			const cachedSectionValues = this._getSectionFromCache(
				this.#currentConfigurationState,

				section,
			);

			// Provide a configuration object based on the cache, but it won't support `inspect` or `update`.
			return this._createShimVscodeWorkspaceConfiguration(
				cachedSectionValues || {},

				section || "",

				scope,

				true /* isProxyUnavailable */,
			);
		}

		let configValuesFromMain: any = {};

		try {
			const resourceDto = resourceFromScope
				? (this._convertApiArgToInternal(
						resourceFromScope,
					) as IConfigurationOverridesDto["resource"])
				: undefined;

			const overridesDto: IConfigurationOverridesDto = {
				resource: resourceDto,

				languageId: languageIdFromScope,
			};

			// `scopeToLanguage` (third param for $getConfiguration RPC) is a VS Code internal concept.
			// It's typically true if only a languageId is provided in the scope without a resource URI,

			// implying a language-specific override at a broader scope (e.g., user or workspace settings).
			// For this shim, passing `undefined` is generally safe; MainThread can apply defaults if needed.
			configValuesFromMain =
				await this.#mainThreadConfigurationProxy.$getConfiguration([
					section || null,

					overridesDto,

					undefined,
				]);
		} catch (error: any) {
			const refinedError = refineErrorForShim(
				error,

				this._logService,

				`getConfiguration(section='${section}')`,
			);

			this._logError(
				`getConfiguration RPC call failed for Section='${section || "(root)"}', Scope=${JSON.stringify(scope)}. Error: ${refinedError.message}. Falling back to local cache.`,
			);

			const cachedSectionValues = this._getSectionFromCache(
				this.#currentConfigurationState,

				section,
			);

			// Fallback to cache on RPC error
			configValuesFromMain = cachedSectionValues || {};
		}

		return this._createShimVscodeWorkspaceConfiguration(
			configValuesFromMain || {},

			section || "",

			scope,
		);
	}

	/**
	 * Extracts a specific configuration section from a larger configuration object.
	 * @param fullConfig The full configuration object (e.g., `this.#currentConfigurationState`).
	 * @param section The dot-separated section path (e.g., "editor.fontSize"). If undefined, returns `fullConfig`.
	 * @returns The value of the specified section, or `undefined` if not found.
	 */
	private _getSectionFromCache(fullConfig: any, section?: string): any {
		// No section means return the root/all of the config object.
		if (!section) return fullConfig;

		let current = fullConfig;

		for (const part of section.split(".")) {
			if (
				current &&
				typeof current === "object" &&
				current !== null &&
				Object.prototype.hasOwnProperty.call(current, part)
			) {
				current = current[part];
			} else {
				// Section part not found
				return undefined;
			}
		}

		return current;
	}

	/**
	 * Creates the `vscode.WorkspaceConfiguration` facade object that extensions interact with.
	 * This object provides methods like `get`, `has`, `inspect`, and `update`.
	 * @param configSnapshotValues The configuration values for the current section (or all if `sectionPrefix` is empty).
	 * @param sectionPrefix The section prefix this configuration object represents (e.g., "editor").
	 * @param originalScope The scope (resource or languageId) this configuration was fetched for, used by `update`.
	 * @param isProxyUnavailable If true, `inspect` and `update` will throw errors as RPC is needed.
	 * @returns A `vscode.WorkspaceConfiguration` instance.
	 */
	private _createShimVscodeWorkspaceConfiguration(
		configSnapshotValues: any,

		sectionPrefix: string,

		originalScope?: VscodeConfigurationScope,

		// New parameter
		isProxyUnavailable = false,
	): VscodeWorkspaceConfiguration {
		// Capture `this` (ShimExtHostConfiguration instance) for use in closures.
		const self = this;

		// Helper to look up a key within the `configSnapshotValues` for this specific configuration object.
		const lookupValue = <T>(key: string): T | undefined => {
			if (!key) {
				// If key is empty, requesting the root of this snapshot.
				try {
					// Deep clone to prevent extensions from mutating the snapshot.
					return typeof configSnapshotValues === "object" &&
						configSnapshotValues !== null
						? JSON.parse(JSON.stringify(configSnapshotValues))
						: configSnapshotValues;
				} catch (e: any) {
					// Should be rare if configSnapshotValues is valid JSON-like data.
					this._logWarn(
						`Failed to deep clone section root for '${sectionPrefix || "(root)"}': ${e.message}. Returning potentially mutable snapshot.`,
					);

					return configSnapshotValues;
				}
			}

			// Traverse dot-separated key parts.
			let current = configSnapshotValues;

			for (const part of key.split(".")) {
				if (
					current &&
					typeof current === "object" &&
					current !== null &&
					Object.prototype.hasOwnProperty.call(current, part)
				) {
					current = current[part];
				} else {
					// Key part not found.
					return undefined;
				}
			}

			try {
				// Deep clone the final value.
				return typeof current === "object" && current !== null
					? JSON.parse(JSON.stringify(current))
					: current;
			} catch (e: any) {
				this._logWarn(
					`Failed to deep clone config value for '${sectionPrefix ? sectionPrefix + "." : ""}${key}': ${e.message}. Returning potentially mutable value.`,
				);

				return current;
			}
		};

		const workspaceConfigShim: VscodeWorkspaceConfiguration = {
			get: <T>(key: string, defaultValue?: T): T | undefined => {
				const value = lookupValue<T>(key);

				return value !== undefined ? value : defaultValue;
			},

			has: (key: string): boolean => {
				return lookupValue<any>(key) !== undefined;
			},

			inspect: async <T>(
				key: string,
			): Promise<
				| {
						key: string;

						defaultValue?: T;

						globalValue?: T;

						workspaceValue?: T;

						workspaceFolderValue?: T;

						languageIds?: string[];

						defaultLanguageValue?: T;

						globalLanguageValue?: T;

						workspaceLanguageValue?: T;

						workspaceFolderLanguageValue?: T;
				  }
				| undefined
			> => {
				if (isProxyUnavailable || !self.#mainThreadConfigurationProxy) {
					const msg =
						"Cannot inspect configuration: RPC proxy to MainThreadConfiguration is unavailable.";

					self._logError(msg);

					// VS Code's API typically returns undefined or throws. Let's return undefined.
					return undefined;
				}

				const fullKeyToInspect = sectionPrefix
					? `${sectionPrefix}.${key}`
					: key;

				try {
					const inspectResultMap =
						await self.#mainThreadConfigurationProxy.$inspect([
							[fullKeyToInspect],

							// $inspect expects an array of keys
						]);

					const inspectInfo = inspectResultMap
						? inspectResultMap[fullKeyToInspect]
						: undefined;

					if (!inspectInfo) return undefined;

					// TODO: Revive any UriComponents within inspectInfo if present (e.g., for languageIds if they were URIs) using self._reviveApiArgument.
					return typeof inspectInfo === "object" &&
						inspectInfo !== null
						? JSON.parse(JSON.stringify(inspectInfo))
						: // Deep clone
							inspectInfo;
				} catch (error: any) {
					const refinedError = refineErrorForShim(
						error,

						self._logService,

						`inspect(key='${fullKeyToInspect}')`,
					);

					self._logError(
						`Configuration.inspect RPC call failed for key='${fullKeyToInspect}': ${refinedError.message}`,
					);

					return undefined;
				}
			},

			update: async (
				key: string,

				value: any,

				configurationTargetOrScope?:
					| VscodeConfigurationTarget
					| boolean
					| VscodeConfigurationScope,

				overrideInLanguageOrScope?: boolean | VscodeConfigurationScope,
			): Promise<void> => {
				if (isProxyUnavailable || !self.#mainThreadConfigurationProxy) {
					const msg = `Cannot update configuration key='${key}': RPC proxy to MainThreadConfiguration is unavailable.`;

					self._logError(msg);

					// `update` should throw if it cannot perform the operation.
					throw new Error(msg);
				}

				const fullKeyToUpdate = sectionPrefix
					? `${sectionPrefix}.${key}`
					: key;

				let targetDto: ConfigurationTargetDto | null | undefined = null;

				let overridesDto: IConfigurationOverridesDto | null = null;

				let scopeToLangDto: boolean | undefined = undefined;

				// --- Argument Parsing Logic for `update` Overloads ---
				// This logic determines the final configuration target, language override flag, and resource/language scope
				// based on the flexible signature of `vscode.WorkspaceConfiguration.update`.
				let finalConfigurationTarget:
					| VscodeConfigurationTarget
					// User, Global, Workspace, WorkspaceFolder
					| undefined;

				// True if updating a language-specific value at the chosen target.
				let finalOverrideInLanguage: boolean | undefined;

				let finalScopeForOverrides:
					| VscodeConfigurationScope
					// Scope (resource/languageId) for the update, defaults to the scope of this WorkspaceConfiguration object.
					| undefined = originalScope;

				if (typeof configurationTargetOrScope === "number") {
					// `configurationTargetOrScope` is VscodeConfigurationTarget (enum value)
					finalConfigurationTarget = configurationTargetOrScope;

					if (typeof overrideInLanguageOrScope === "boolean") {
						// `overrideInLanguageOrScope` is boolean (overrideInLanguage)
						finalOverrideInLanguage = overrideInLanguageOrScope;
					} else if (overrideInLanguageOrScope) {
						// `overrideInLanguageOrScope` is VscodeConfigurationScope
						// This scope overrides the originalScope for this update.
						finalScopeForOverrides = overrideInLanguageOrScope;
					}
				} else if (typeof configurationTargetOrScope === "boolean") {
					// `configurationTargetOrScope` is boolean (globalOrWorkspace)
					finalConfigurationTarget = configurationTargetOrScope
						? VscodeConfigurationTarget.Global
						: VscodeConfigurationTarget.Workspace;

					if (typeof overrideInLanguageOrScope === "boolean") {
						// `overrideInLanguageOrScope` is boolean (overrideInLanguage)
						finalOverrideInLanguage = overrideInLanguageOrScope;

						// Note: If overrideInLanguageOrScope were a VscodeConfigurationScope here, it would be unusual but could define scope.
					}
				} else if (configurationTargetOrScope) {
					// `configurationTargetOrScope` is VscodeConfigurationScope
					// This scope is used. Target is inferred or default.
					finalScopeForOverrides = configurationTargetOrScope;

					if (typeof overrideInLanguageOrScope === "boolean") {
						// `overrideInLanguageOrScope` is boolean (overrideInLanguage)
						finalOverrideInLanguage = overrideInLanguageOrScope;
					}
				} else {
					// `configurationTargetOrScope` is undefined/null
					if (typeof overrideInLanguageOrScope === "boolean") {
						// `overrideInLanguageOrScope` is boolean (overrideInLanguage)
						finalOverrideInLanguage = overrideInLanguageOrScope;
					} else if (overrideInLanguageOrScope) {
						// `overrideInLanguageOrScope` is VscodeConfigurationScope
						// This scope is used.
						finalScopeForOverrides = overrideInLanguageOrScope;
					}
				}

				// --- Convert to DTOs for RPC ---
				// Map VscodeConfigurationTarget (API enum) to ConfigurationTargetDto (protocol enum)
				if (
					finalConfigurationTarget ===
					VscodeConfigurationTarget.Global
				)
					// VS Code's "Global" often maps to UserLocal settings.
					targetDto = ConfigurationTargetDto.UserLocal;
				else if (
					finalConfigurationTarget ===
					VscodeConfigurationTarget.Workspace
				)
					targetDto = ConfigurationTargetDto.Workspace;
				else if (
					finalConfigurationTarget ===
					VscodeConfigurationTarget.WorkspaceFolder
				) {
					// WorkspaceFolder target requires a resource URI in the scope.
					const resourceUriForFolderTarget =
						finalScopeForOverrides instanceof VscodeUri
							? finalScopeForOverrides
							: typeof finalScopeForOverrides === "object" &&
								  finalScopeForOverrides?.uri instanceof
										VscodeUri
								? finalScopeForOverrides.uri
								: undefined;

					if (resourceUriForFolderTarget) {
						targetDto = ConfigurationTargetDto.WorkspaceFolder;

						// Ensure overridesDto.resource is set if not already from finalScopeForOverrides
						if (!overridesDto?.resource) {
							overridesDto = {
								...(overridesDto || {}),

								resource: self._convertApiArgToInternal(
									resourceUriForFolderTarget,
								) as IConfigurationOverridesDto["resource"],
							};
						}
					} else {
						self._logWarn(
							`Configuration.update: WorkspaceFolder target specified for key '${fullKeyToUpdate}', but no resource URI was provided in the scope. Update may not apply correctly or might default to a broader scope.`,
						);

						// Fallback or error? VS Code might default to Workspace if folder URI is missing. For shim, let RPC handle if targetDto is null.
					}

					// If finalConfigurationTarget is undefined, targetDto remains null (MainThread infers target, usually UserLocal).
				}

				// Determine overridesDto for resource/languageId scoping
				if (finalScopeForOverrides instanceof VscodeUri) {
					overridesDto = {
						resource: self._convertApiArgToInternal(
							finalScopeForOverrides,
						) as IConfigurationOverridesDto["resource"],

						languageId: undefined,
					};
				} else if (
					typeof finalScopeForOverrides === "object" &&
					finalScopeForOverrides !== null
				) {
					overridesDto = {
						resource: finalScopeForOverrides.uri
							? (self._convertApiArgToInternal(
									finalScopeForOverrides.uri,
								) as IConfigurationOverridesDto["resource"])
							: undefined,

						languageId: finalScopeForOverrides.languageId,
					};
				}

				// Determine scopeToLangDto (VS Code internal concept for language-specific overrides at a non-resource scope)
				scopeToLangDto = finalOverrideInLanguage;

				if (
					finalOverrideInLanguage === undefined &&
					overridesDto?.languageId &&
					!overridesDto.resource
				) {
					// If a languageId is specified in overridesDto without a resource, it implies a language-specific
					// setting at the current target scope (e.g., User settings for a language).
					scopeToLangDto = true;
				}

				try {
					await self.#mainThreadConfigurationProxy!.$updateConfigurationOption(
						[
							targetDto,

							fullKeyToUpdate,

							value,

							overridesDto,

							scopeToLangDto,
						],
					);

					// Config is updated on main thread; ExtHost cache will be updated via an $acceptConfigurationChanged call.
				} catch (error: any) {
					const refinedError = refineErrorForShim(
						error,

						self._logService,

						`update(key='${fullKeyToUpdate}')`,
					);

					self._logError(
						`Configuration.update RPC call failed for key='${fullKeyToUpdate}': ${refinedError.message}`,
					);

					// Rethrow to signal failure to the extension.
					throw refinedError;
				}
			},
		};

		// Use a Proxy to handle direct property access (e.g., `config.editor.fontSize` as `config.get('editor.fontSize')`).
		return new Proxy(workspaceConfigShim, {
			get(target, prop: string | symbol, receiver) {
				// Handle standard methods and properties of WorkspaceConfiguration first.
				if (
					prop in target ||
					typeof prop === "symbol" ||
					prop === "then" /* For Thenable */ ||
					typeof prop === "function" /* Check for methods by type */
				) {
					return Reflect.get(target, prop, receiver);
				}

				// For direct property access like `config.someKey` or `config.section.key`.
				if (typeof prop === "string") {
					// `config.someKey` calls `config.get('someKey')`.
					// Nested access `config.section.key` relies on `config.get('section')` returning an object
					// from which `key` is then accessed by JavaScript's standard property accessor.
					// The `lookupValue` function in `get` already handles creating a new proxy for sub-sections if they are objects.
					return target.get(prop);
				}

				// Fallback for other symbols or unexpected types
				return Reflect.get(target, prop, receiver);
			},

			has(target, prop: string | symbol) {
				if (prop in target || typeof prop === "symbol")
					return Reflect.has(target, prop);

				// Calls target.has(prop) for string keys
				if (typeof prop === "string") return target.has(prop);

				return Reflect.has(target, prop);
			},
		}) as VscodeWorkspaceConfiguration;
	}

	/** The event that fires when configuration values have changed. */
	get onDidChangeConfiguration(): VscodeEvent<VscodeConfigurationChangeEvent> {
		return this._createVscodeEventFromNodeEmitter<VscodeConfigurationChangeEvent>(
			this.#onDidChangeConfigurationEmitter,

			"fire",
		);
	}

	/**
	 * Provides a configuration provider object for the `NodeRequireInterceptor`.
	 * This allows `require('vscode')` to correctly provide `vscode.workspace.getConfiguration`.
	 * The `VSCodeNodeModuleFactory` calls this to get the `getConfiguration` function.
	 */
	public async getConfigProvider(): Promise<{
		getConfiguration: IExtHostConfiguration["getConfiguration"];
	}> {
		return {
			getConfiguration: (
				section?: string,

				// `scope` can be VscodeConfigurationScope or, due to VSCodeNodeModuleFactory, an ExtensionIdentifier.
				scopeOrExtensionId?:
					| VscodeConfigurationScope
					| ExtensionIdentifier,

				// `_actualExtensionIdIfSecondWasScope` is an internal detail from VSCodeNodeModuleFactory, not used by this getConfiguration.
				_actualExtensionIdIfSecondWasScope?: ExtensionIdentifier,
			): Promise<VscodeWorkspaceConfiguration> => {
				let actualScope: VscodeConfigurationScope | undefined =
					undefined;

				if (scopeOrExtensionId instanceof ExtensionIdentifier) {
					// If the second argument is an ExtensionIdentifier, it's an older pattern from VSCodeNodeModuleFactory
					// where the extension context was passed. Modern getConfiguration expects scope (URI or {uri, langId}).
					// We treat this as having no specific resource/language scope for the getConfiguration call.
					this._logWarnOnce(
						"getConfigProvider's getConfiguration called with ExtensionIdentifier as scope; interpreting as no specific resource/language scope.",
					);
				} else {
					// It's a VscodeConfigurationScope or undefined.
					actualScope = scopeOrExtensionId;
				}

				return this.getConfiguration(section, actualScope);
			},
		};
	}

	/**
	 * Disposes of resources held by this shim instance, such as event emitters and IPC listeners.
	 */
	public override dispose(): void {
		// Disposes _instanceDisposables (which includes the IPC listener for config changes)
		super.dispose();

		// Clean up Node.js EventEmitter listeners
		this.#onDidChangeConfigurationEmitter.removeAllListeners();

		this._logInfo("Disposed.");
	}
}
