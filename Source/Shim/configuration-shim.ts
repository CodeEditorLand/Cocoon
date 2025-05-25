/*---------------------------------------------------------------------------------------------
 * Cocoon Configuration Shim (shims/configuration-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.workspace.getConfiguration` API, allowing extensions to access
 * configuration settings. This shim is the ExtHost-side representation of the
 * configuration service (`IExtHostConfiguration`).
 *
 * It maintains a cache of the current configuration state and proxies requests for
 * specific configuration sections or inspection details to a `MainThreadConfiguration`
 * service running in the Mountain host process via RPC. It also handles configuration
 * change notifications pushed from Mountain.
 *
 * Responsibilities:
 * - Providing the `vscode.workspace.getConfiguration(section?, scope?)` method, which
 *   returns a `vscode.WorkspaceConfiguration` object.
 * - Managing an internal cache of the effective configuration values, initialized from
 *   `initData` and updated by RPC calls from Mountain (`$initializeConfiguration`,
 *   `$acceptConfigurationChanged`) or IPC events.
 * - `ShimWorkspaceConfigurationImpl` (internal class returned by `getConfiguration`):
 *   - Implements `vscode.WorkspaceConfiguration` methods (`get`, `has`, `inspect`, `update`).
 *   - `get`, `has`: Read from a snapshot of relevant configuration values.
 *   - `inspect`, `update`: Proxy these operations to `MainThreadConfiguration` via RPC.
 * - Handling the `vscode.workspace.onDidChangeConfiguration` event, fired when
 *   configuration changes are received from Mountain.
 * - Providing a `getConfigProvider()` method for use by the `NodeRequireInterceptor`
 *   (specifically `VSCodeNodeModuleFactory`) when an extension requires the `vscode` module.
 *
 * Key Interactions:
 * - An instance of `ShimExtHostConfiguration` is registered with DI in `Cocoon/index.ts`
 *   as `IExtHostConfiguration`.
 * - The `vscode.workspace.getConfiguration` method (and `onDidChangeConfiguration` event)
 *   provided to extensions (via the API factory) delegate to this service.
 * - Communicates with `MainContext.MainThreadConfiguration` on Mountain via RPC for
 *   fetching, inspecting, and updating configurations.
 * - Can receive configuration updates via direct IPC (`ipc.onConfigurationChanged`) as an
 *   alternative or supplement to RPC push from Mountain.
 * - Uses `BaseCocoonShim` for common utilities.
 *
 * Last Reviewed/Updated: [Your Last Review Date or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter } from "events"; // Node.js EventEmitter for onDidChangeConfiguration
import type { Event as VscodeEvent } from "vs/base/common/event";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions"; // For getConfigProvider (if extId is used)
import {
	ConfigurationTargetDto, // Protocol DTO for configuration target
	ExtHostContext, // For registering this service for RPC from MainThread (if VscodeExtHostConfigurationShape is implemented)
	MainContext, // For proxying to MainThreadConfiguration
	type IConfigurationChange, // DTO for configuration change details (from protocol)
	type IConfigurationInitData, // DTO for initial configuration data (from protocol)
	type IConfigurationOverridesDto, // DTO for scope overrides (from protocol)
	type ExtHostConfigurationShape as VscodeExtHostConfigurationShape, // RPC shape for methods called by MainThread
} from "vs/workbench/api/common/extHost.protocol";

// For onConfigurationChanged IPC event subscription
import * as ipc from "../cocoon-ipc";
import {
	ConfigurationTarget as VscodeConfigurationTarget, // Public API enum
	Uri as VscodeUri, // Public API URI type
	type ConfigurationChangeEvent as VscodeConfigurationChangeEvent,
	type WorkspaceConfiguration as VscodeWorkspaceConfiguration,
} from "../Shim/out/vscode";
// vscode API types
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
 */
interface MainThreadConfigurationProxyShape {
	/**
	 * Fetches configuration values.
	 * @param args Tuple: [section, overridesDto, scopeToLanguageBoolean]
	 */
	$getConfiguration(
		args: [
			string | null,
			IConfigurationOverridesDto | null,
			boolean | undefined,
		],
	): Promise<any>;
	/**
	 * Inspects configuration keys.
	 * @param args Tuple: [keysArray]
	 */
	$inspect(
		args: [string[]],
	): Promise<{ [key: string]: any /* IConfigurationInspect<any> DTO */ }>;
	/**
	 * Updates a configuration option.
	 * @param args Tuple: [targetDto, key, value, overridesDto, scopeToLanguageBoolean]
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

/**
 * Expected structure of `initData.configurationData` or a simplified version for this shim.
 * `IConfigurationInitData` from `extHost.protocol.ts` is more complete.
 */
interface ShimInitDataForConfig {
	/** Snapshot of effective configuration values. */
	effective?: { [key: string]: any }; // Aligns with IConfigurationInitData.effective
	// Or if a simpler structure like `values` was used in older shims:
	// values?: any;
}

/** Payload from Mountain's `$acceptConfigurationChanged` IPC notification: new config snapshot. */
interface MountainConfigNotificationPayload {
	values: any;
}
/** Payload from Mountain's `$acceptConfigurationChanged` IPC notification: change details. */
interface MountainConfigChangeDetails {
	keys: string[];
	overrides: [string, string[]][]; // [identifier, keys[]][]
}

/** Represents the scope for `vscode.workspace.getConfiguration`. */
type VscodeConfigurationScope =
	| VscodeUri
	| { uri?: VscodeUri; languageId?: string }
	| null
	| undefined;

/**
 * Cocoon's implementation of `IExtHostConfiguration`.
 * Manages extension access to configuration settings.
 */
export class ShimExtHostConfiguration
	extends BaseCocoonShim
	implements VscodeExtHostConfigurationShape
{
	// Implements RPC shape for calls from MainThread
	public readonly _serviceBrand: undefined; // Required by VS Code's service types

	#mainThreadConfigurationProxy: MainThreadConfigurationProxyShape | null =
		null;
	#currentConfigurationState: any = {}; // Cache of the latest full effective configuration.
	// #initDataSnapshot: any = {}; // If needed for comparison or reset to initial state.

	readonly #onDidChangeConfigurationEmitter = new EventEmitter(); // Node.js EventEmitter

	/**
	 * Creates an instance of ShimExtHostConfiguration.
	 * @param rpcService The RPC service adapter.
	 * @param configurationInitData Initial configuration data (e.g., `revivedInitData.configurationData`).
	 * @param logService The logging service.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		configurationInitData: IConfigurationInitData | undefined, // Expecting IConfigurationInitData from ExtHostInitData
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostConfiguration", rpcService, logService);
		this._log("Initializing...");

		if (configurationInitData?.effective) {
			this.#currentConfigurationState = JSON.parse(
				JSON.stringify(configurationInitData.effective),
			); // Deep clone
			this._log(
				"Initial configuration cache populated from initData.configurationData.effective.",
			);
		} else {
			this._logWarn(
				"No initial configuration data (initData.configurationData.effective) provided. Cache starts empty. Expecting $initializeConfiguration call.",
			);
		}

		if (this._rpcService) {
			this.#mainThreadConfigurationProxy = this._getProxy(
				MainContext.MainThreadConfiguration as ProxyIdentifier<MainThreadConfigurationProxyShape>,
			);
			if (this.#mainThreadConfigurationProxy) {
				this._log("MainThreadConfiguration RPC proxy obtained.");
			} else {
				this._logError(
					"MainThreadConfiguration RPC proxy NOT obtained. Configuration features will be severely impaired.",
				);
			}
			// Register self for RPC calls from MainThreadConfiguration
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostConfiguration as ProxyIdentifier<VscodeExtHostConfigurationShape>,
					this,
				);
				this._log(
					"Registered self for RPC calls from MainThread (ExtHostConfiguration).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to set self for RPC (ExtHostConfiguration):",
					e,
				);
			}
		} else {
			this._logError(
				"RPCService (IRpcProtocolServiceAdapter) unavailable. Cannot proxy to MainThreadConfiguration or receive RPC updates.",
			);
		}

		// Subscribe to `$acceptConfigurationChanged` IPC event from Mountain as an alternative update mechanism.
		this._instanceDisposables.add(
			// Manage this subscription
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
							"IPC $acceptConfigurationChanged: Invalid newConfigPayload received.",
							newConfigPayload,
						);
						return;
					}
					this._log(
						`IPC $acceptConfigurationChanged: Updating cache. Affected keys from details: [${changeDetails?.keys?.join(", ") ?? "N/A"}]`,
					);
					this.#currentConfigurationState = JSON.parse(
						JSON.stringify(newConfigPayload.values),
					); // Deep clone

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
								this._logWarnOnce(
									`ConfigurationChangeEvent.affectsConfiguration with scope checking is NOT fully implemented for IPC-triggered changes. Scope: ${scope.toString()}`,
								);
							}
							if (!section) return true; // Any change affects root if section is empty/null.
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
					);
					this._log(
						"Fired public onDidChangeConfiguration event due to IPC update.",
					);
				},
			),
		);
		this._log(
			"Subscribed to IPC configuration change events from Mountain.",
		);
	}

	// --- VscodeExtHostConfigurationShape Methods (called by MainThread via RPC) ---

	/**
	 * Initializes the configuration cache with data from the main thread.
	 * This is typically called once during extension host startup.
	 * @param data The initial configuration data, including effective values.
	 */
	public $initializeConfiguration(data: IConfigurationInitData): void {
		this._log(
			`RPC $initializeConfiguration received. Effective keys count: ${Object.keys(data.effective || {}).length}`,
		);
		this.#currentConfigurationState = JSON.parse(
			JSON.stringify(data.effective || {}),
		); // Deep clone
		// this.#initDataSnapshot = JSON.parse(JSON.stringify(data.effective || {})); // Update initial snapshot too
		this._log(
			"Configuration cache initialized/updated via $initializeConfiguration RPC.",
		);
		// Note: An onDidChangeConfiguration event is typically NOT fired for the initial load,
		// unless this significantly differs from what was in the constructor's initData.
		// VS Code's behavior is that getConfiguration calls before this often block or return empty.
	}

	/**
	 * Accepts configuration changes from the main thread and updates the local cache.
	 * Fires the `onDidChangeConfiguration` event.
	 * @param data The new full configuration data (containing the latest `effective` values).
	 * @param change Details about what keys and scopes changed.
	 */
	public $acceptConfigurationChanged(
		data: IConfigurationInitData,
		change: IConfigurationChange,
	): void {
		this._log(
			`RPC $acceptConfigurationChanged. Changed keys: [${change.keys.join(", ")}], Overrides affected: ${change.overrides?.length ?? 0}`,
		);
		this.#currentConfigurationState = JSON.parse(
			JSON.stringify(data.effective || {}),
		); // Update with new effective config

		const eventArg: VscodeConfigurationChangeEvent = {
			affectsConfiguration: (
				section: string,
				scope?: VscodeUri,
			): boolean => {
				// Logic from VS Code's ExtHostConfiguration._lookUp(config, section, scopeURI)
				// This checks if any of the changed keys or override changes affect the given section/scope.
				if (!section) return true; // Empty section means "any change"

				for (const key of change.keys) {
					// Check top-level key changes
					if (key === section || key.startsWith(section + "."))
						return true;
				}
				if (change.overrides) {
					// Check override changes
					for (const override of change.overrides) {
						// An override applies if its identifier (URI string or language ID) matches the scope.
						const scopeIdentifier = scope
							? scope.languageId || scope.toString()
							: undefined;
						if (
							scopeIdentifier &&
							!override.identifiers.includes(scopeIdentifier)
						) {
							continue; // This override change doesn't apply to the queried scope.
						}
						// If the override applies to the scope (or scope is undefined, meaning any scope), check its keys.
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
		);
		this._log(
			"Fired public onDidChangeConfiguration event via RPC update ($acceptConfigurationChanged).",
		);
	}

	// --- vscode.workspace.getConfiguration API Implementation ---

	/**
	 * Gets a workspace configuration object.
	 * @param section Configuration section, can be empty for all.
	 * @param scope Scope for which to get configuration (e.g., URI of a resource or language ID).
	 * @returns A `vscode.WorkspaceConfiguration` instance.
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

		// const scopeForLog = resourceFromScope ? resourceFromScope.toString() : (languageIdFromScope || "global");
		// this._logService?.trace(`getConfiguration: Section='${section || "(root)"}', Scope='${scopeForLog}'`);

		if (!this.#mainThreadConfigurationProxy) {
			this._logError(
				"Cannot getConfiguration: RPC proxy unavailable. Using potentially stale/initial cache.",
			);
			const cachedSectionValues = this._getSectionFromCache(
				this.#currentConfigurationState,
				section,
			);
			return this._createShimVscodeWorkspaceConfiguration(
				cachedSectionValues || {},
				section || "",
				scope,
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
			// `scopeToLanguage` (third param for $getConfiguration) is an internal VS Code concept,
			// typically true if only languageId is provided in scope without a resource URI.
			// For this shim, passing undefined as it's less critical for basic getConfiguration.
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
				`getConfiguration(${section})`,
			);
			this._logError(
				`getConfiguration RPC failed for Section='${section || "(root)"}', Scope=${JSON.stringify(scope)}. Error: ${refinedError.message}. Falling back to cache.`,
			);
			const cachedSectionValues = this._getSectionFromCache(
				this.#currentConfigurationState,
				section,
			);
			configValuesFromMain = cachedSectionValues || {}; // Fallback to cache on error
		}
		return this._createShimVscodeWorkspaceConfiguration(
			configValuesFromMain || {},
			section || "",
			scope,
		);
	}

	/** Extracts a specific section from a full configuration object. */
	private _getSectionFromCache(fullConfig: any, section?: string): any {
		if (!section) return fullConfig; // Return full object if no section specified.
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
				return undefined; // Section part not found
			}
		}
		return current;
	}

	/** Creates the `vscode.WorkspaceConfiguration` facade object. */
	private _createShimVscodeWorkspaceConfiguration(
		configSnapshotValues: any, // Values for the current section (or all if sectionPrefix is empty)
		sectionPrefix: string, // The section prefix this configuration object represents (e.g., "editor")
		originalScope?: VscodeConfigurationScope, // The scope this configuration was fetched for (for `update`)
	): VscodeWorkspaceConfiguration {
		const self = this; // For use in proxy and methods

		const lookupValue = <T>(key: string): T | undefined => {
			// If key is empty, we are asking for the root of this configuration snapshot.
			if (!key) {
				try {
					// Deep clone to prevent mutation of the snapshot by extensions
					return typeof configSnapshotValues === "object" &&
						configSnapshotValues !== null
						? JSON.parse(JSON.stringify(configSnapshotValues))
						: configSnapshotValues;
				} catch (e: any) {
					this._logWarn(
						`Failed to deep clone section root for '${sectionPrefix}': ${e.message}. Returning potentially mutable snapshot.`,
					);
					return configSnapshotValues;
				}
			}
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
					return undefined;
				}
			}
			try {
				// Deep clone to prevent mutation by extensions
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
						/* ... IConfigurationInspect<T> properties ... */ key: string;
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
				const fullKeyToInspect = sectionPrefix
					? `${sectionPrefix}.${key}`
					: key;
				if (!self.#mainThreadConfigurationProxy) {
					self._logError(
						"Cannot inspect configuration: RPC proxy unavailable.",
					);
					return undefined;
				}
				try {
					// $inspect expects an array of keys.
					const inspectResultMap =
						await self.#mainThreadConfigurationProxy.$inspect([
							[fullKeyToInspect],
						]);
					const inspectInfo = inspectResultMap
						? inspectResultMap[fullKeyToInspect]
						: undefined;
					if (!inspectInfo) return undefined;
					// Deep clone the result to prevent mutation.
					// TODO: Revive any UriComponents within inspectInfo if present (e.g., for languageIds if they were URIs).
					return typeof inspectInfo === "object" &&
						inspectInfo !== null
						? JSON.parse(JSON.stringify(inspectInfo))
						: inspectInfo;
				} catch (error: any) {
					const refinedError = refineErrorForShim(
						error,
						self._logService,
						`inspect(${fullKeyToInspect})`,
					);
					self._logError(
						`Configuration.inspect RPC failed for key='${fullKeyToInspect}': ${refinedError.message}`,
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
				const fullKeyToUpdate = sectionPrefix
					? `${sectionPrefix}.${key}`
					: key;
				let targetDto: ConfigurationTargetDto | null | undefined = null;
				let overridesDto: IConfigurationOverridesDto | null = null;
				let scopeToLangDto: boolean | undefined = undefined; // VS Code internal flag

				let finalConfigurationTarget:
					| VscodeConfigurationTarget
					| undefined;
				let finalOverrideInLanguage: boolean | undefined;
				let finalScopeForOverrides:
					| VscodeConfigurationScope
					| undefined = originalScope;

				if (typeof configurationTargetOrScope === "number") {
					// VscodeConfigurationTarget enum
					finalConfigurationTarget = configurationTargetOrScope;
					if (typeof overrideInLanguageOrScope === "boolean") {
						finalOverrideInLanguage = overrideInLanguageOrScope;
					} else if (overrideInLanguageOrScope) {
						// It's a ConfigurationScope
						finalScopeForOverrides = overrideInLanguageOrScope;
					}
				} else if (typeof configurationTargetOrScope === "boolean") {
					// Global or Workspace inspection target
					finalConfigurationTarget = configurationTargetOrScope
						? VscodeConfigurationTarget.Global
						: VscodeConfigurationTarget.Workspace;
					if (typeof overrideInLanguageOrScope === "boolean") {
						// This would be overrideInLanguage
						finalOverrideInLanguage = overrideInLanguageOrScope;
					} // else if it's a scope, it's unusual here, but possible
				} else if (configurationTargetOrScope) {
					// It's a ConfigurationScope
					finalScopeForOverrides = configurationTargetOrScope;
					// If the first scope-like arg is a ConfigurationScope, the target is inferred or default.
					// The second scope-like arg (overrideInLanguageOrScope) if boolean is overrideInLanguage.
					if (typeof overrideInLanguageOrScope === "boolean") {
						finalOverrideInLanguage = overrideInLanguageOrScope;
					}
				} else {
					// configurationTargetOrScope is undefined/null
					if (typeof overrideInLanguageOrScope === "boolean") {
						// This would be overrideInLanguage
						finalOverrideInLanguage = overrideInLanguageOrScope;
					} else if (overrideInLanguageOrScope) {
						// It's a ConfigurationScope
						finalScopeForOverrides = overrideInLanguageOrScope;
					}
				}

				// Determine targetDto (for RPC)
				if (
					finalConfigurationTarget ===
					VscodeConfigurationTarget.Global
				)
					targetDto = ConfigurationTargetDto.UserLocal; // Or User if that's the mapping
				else if (
					finalConfigurationTarget ===
					VscodeConfigurationTarget.Workspace
				)
					targetDto = ConfigurationTargetDto.Workspace;
				else if (
					finalConfigurationTarget ===
					VscodeConfigurationTarget.WorkspaceFolder
				) {
					if (finalScopeForOverrides instanceof VscodeUri)
						targetDto = ConfigurationTargetDto.WorkspaceFolder;
					else if (
						typeof finalScopeForOverrides === "object" &&
						finalScopeForOverrides?.uri instanceof VscodeUri
					)
						targetDto = ConfigurationTargetDto.WorkspaceFolder;
					else {
						self._logWarn(
							"update: WorkspaceFolder target specified without a URI scope. Update may not apply correctly.",
						);
					}
				}

				// Determine overridesDto (for RPC)
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

				// Determine scopeToLangDto (for RPC - VS Code internal concept)
				scopeToLangDto = finalOverrideInLanguage;
				if (
					finalOverrideInLanguage === undefined &&
					overridesDto?.languageId &&
					!overridesDto.resource
				) {
					// If languageId is set in overrides without a resource, it implies language-specific in current scope (e.g. user settings)
					scopeToLangDto = true;
				}

				if (!self.#mainThreadConfigurationProxy) {
					const msg = `Cannot update configuration key='${fullKeyToUpdate}': RPC proxy unavailable.`;
					self._logError(msg);
					throw new Error(msg);
				}
				try {
					await self.#mainThreadConfigurationProxy.$updateConfigurationOption(
						[
							targetDto,
							fullKeyToUpdate,
							value,
							overridesDto,
							scopeToLangDto,
						],
					);
					// Configuration is updated on main thread; this ExtHost cache will be updated via $acceptConfigurationChanged.
				} catch (error: any) {
					const refinedError = refineErrorForShim(
						error,
						self._logService,
						`update(${fullKeyToUpdate})`,
					);
					self._logError(
						`Configuration.update RPC failed for key='${fullKeyToUpdate}': ${refinedError.message}`,
					);
					throw refinedError;
				}
			},
		};

		// Use a Proxy to handle direct property access (e.g., config.editor.fontSize)
		return new Proxy(workspaceConfigShim, {
			get(target, prop: string | symbol, receiver) {
				if (
					prop in target ||
					typeof prop === "symbol" ||
					prop === "then" ||
					typeof prop === "function" /* For Thenable */
				) {
					return Reflect.get(target, prop, receiver);
				}
				if (typeof prop === "string") {
					// For direct property access like `config.editor` or `config.editor.fontSize`.
					// `target.get(prop)` will return the value of `prop` within the current section.
					// If `prop` itself represents a sub-section (e.g., `editor` from `config.editor`),
					// `lookupValue(prop)` would return that sub-object.
					// To support `config.editor.fontSize`, if `config.editor` returns an object,
					// we'd need that object to also be a WorkspaceConfiguration or a proxy.
					// Simpler for MVP: direct access `config.someKey` calls `config.get('someKey')`.
					// Nested access `config.section.key` relies on `config.get('section')` returning an object,
					// from which `key` is then accessed by JavaScript's property accessor.
					return target.get(prop);
				}
				return Reflect.get(target, prop, receiver);
			},
			has(target, prop: string | symbol) {
				if (prop in target || typeof prop === "symbol")
					return Reflect.has(target, prop);
				if (typeof prop === "string") return target.has(prop); // Calls target.has(prop)
				return Reflect.has(target, prop);
			},
		}) as VscodeWorkspaceConfiguration;
	}

	/** The event that fires when configuration values have changed. */
	get onDidChangeConfiguration(): VscodeEvent<VscodeConfigurationChangeEvent> {
		return this._createEventFromEmitter<VscodeConfigurationChangeEvent>(
			this.#onDidChangeConfigurationEmitter,
			"fire",
		);
	}

	/**
	 * Provides a configuration provider object for the `NodeRequireInterceptor`.
	 * This allows `require('vscode')` to correctly provide `vscode.workspace.getConfiguration`.
	 */
	public async getConfigProvider(): Promise<{
		getConfiguration: IExtHostConfiguration["getConfiguration"];
	}> {
		return {
			getConfiguration: (
				section?: string,
				scope?: VscodeConfigurationScope | ExtensionIdentifier,
				_extensionId_unused?: ExtensionIdentifier,
			) => {
				// The VSCodeNodeModuleFactory might pass extensionId as the third param,
				// but our getConfiguration takes scope as the second.
				// We need to correctly interpret `scopeOrExtensionId`.
				let actualScope: VscodeConfigurationScope | undefined =
					undefined;
				if (scope instanceof ExtensionIdentifier) {
					// If second arg is ExtensionId, it implies no specific scope was passed by the require('vscode') call,
					// or it's an older API. For modern getConfiguration, scope is Uri or {uri, langId}.
					// We'll treat this as no scope.
					this._logWarnOnce(
						"getConfigProvider received ExtensionIdentifier as scope; interpreting as no specific scope for getConfiguration.",
					);
				} else {
					actualScope = scope;
				}
				return this.getConfiguration(section, actualScope);
			},
		};
	}

	/**
	 * Disposes of resources held by this shim instance.
	 */
	public override dispose(): void {
		super.dispose(); // Disposes _instanceDisposables (which includes IPC listener)
		this.#onDidChangeConfigurationEmitter.removeAllListeners(); // Clean up Node EventEmitter
		this._log("Disposed.");
	}
}
