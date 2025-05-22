/*---------------------------------------------------------------------------------------------
 * Cocoon Configuration Shim (shims/configuration-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements `vscode.workspace.getConfiguration` API (via `IExtHostConfiguration`) for Cocoon.
 * Proxies requests to Mountain (via `config_effects` called by `MainThreadConfigurationHandler`)
 * and handles configuration change notifications from Mountain.
 *
 * Key Interactions:
 * - Provides `vscode.workspace.getConfiguration` and `vscode.WorkspaceConfiguration`.
 * - Interacts with `MainThreadConfiguration` RPC proxy.
 * - Listens to `cocoon-ipc` for `$acceptConfigurationChanged` notifications from Mountain.
 * - Uses `BaseCocoonShim` for common utilities.
 *--------------------------------------------------------------------------------------------*/

import type { Event as VscodeEvent } from "vs/base/common/event";
import {
	ConfigurationTargetDto,
	type IConfigurationChange,
	type IConfigurationInitData,
	type IConfigurationOverridesDto,
	MainContext,
	type ExtHostConfigurationShape as VscodeExtHostConfigurationShape,
	// Protocol DTOs and shapes
} from "vs/workbench/api/common/extHost.protocol";

// EventEmitter from 'events' is used by _createEventEmitter from BaseCocoonShim
import {
	type ConfigurationChangeEvent as VscodeConfigurationChangeEvent,
	ConfigurationTarget as VscodeConfigurationTarget,
	Uri as VscodeUri,
	type WorkspaceConfiguration as VscodeWorkspaceConfiguration,
	// vscode API types
} from "../Shim/out/vscode";
// For onConfigurationChanged IPC event
import * as ipc from "../cocoon-ipc";
import {
	BaseCocoonShim,
	type IExtHostRpcService,
	type ILogService,
	type ProxyIdentifier,
	refineError,
} from "./_baseShim";

// --- Type Definitions ---

// For MainThreadConfiguration RPC proxy (based on Mountain's rpc.rs and config_effects)
// TODO: This MUST align with Mountain's MainThreadConfigurationHandler methods.
interface MainThreadConfigurationProxyShape {
	// Mountain's rpc.rs methods take `args: Value` which is an array of these params.
	$getConfiguration(
		args: [
			string | null,
			IConfigurationOverridesDto | null,
			boolean | undefined,
		],

		// [section, overrides, scopeToLanguage?] -> returns config values
	): Promise<any>;

	$inspect(
		args: [string[]],

		// [keys] -> returns { key: InspectResultDto }
	): Promise<{ [key: string]: any /* InspectResultDto */ }>;

	$updateConfigurationOption(
		args: [
			ConfigurationTargetDto | null | undefined,
			string,
			any,
			IConfigurationOverridesDto | null,
			boolean | undefined,
		],

		// [target, key, value, overrides, scopeToLanguage?]
	): Promise<void>;

	// $removeConfigurationOption is essentially $update with value=null, so one method might suffice on proxy.
	// If Mountain has a distinct $remove, add it here.
}

// For initData structure (ExtHostInitData contains `configuration: IConfigurationInitData`)
// IConfigurationInitData: { target: ConfigurationTarget; data: { [key: string]: any; }; effective: { [key: string]: any; }; memory: { [key: string]: any; }; }

// For this shim, we primarily care about `effective` or a simpler values snapshot.
// The original shim used `initData.configuration.values`.
interface ShimInitDataForConfig {
	configuration?: {
		// Snapshot of effective configuration
		values?: any;

		// Or more aligned with IConfigurationInitData:
		// effective?: { [key: string]: any };
	};
}

// For IPC `$acceptConfigurationChanged` payload from Mountain
// Mountain sends: [config_data_for_notification, change_detail]
// config_data_for_notification: { "values": merged_config_values }

// change_detail: { "keys": affected_keys, "overrides": [] }

interface MountainConfigNotificationPayload {
	// The new full configuration snapshot
	values: any;
}

interface MountainConfigChangeDetails {
	keys: string[];

	// [identifier, keys[]][] (though Mountain currently sends empty)
	overrides: [string, string[]][];
}

// ConfigurationScope type from vscode.d.ts
type VscodeConfigurationScope =
	| VscodeUri
	| { uri?: VscodeUri; languageId?: string }
	| null
	| undefined;

export class ShimExtHostConfiguration
	extends BaseCocoonShim
	implements VscodeExtHostConfigurationShape
{
	// For IExtHostConfiguration DI
	public readonly _serviceBrand: undefined;

	// Store the initial snapshot from initData.configuration.values
	#initDataSnapshot: any = {};

	#mainThreadConfigurationProxy: MainThreadConfigurationProxyShape | null =
		null;

	// Cache of the latest full configuration state (effective values)
	#currentConfigurationState: any = {};

	readonly #onDidChangeConfigurationEmitter: EventEmitter =
		// Node's EventEmitter
		this._createEventEmitter();

	constructor(
		rpcService: IExtHostRpcService | undefined,

		// initData is ExtHostInitData from IExtHostInitDataService, which contains IConfigurationInitData
		// For simplicity, this shim might only consume a part of it.
		initData: ShimInitDataForConfig | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtHostConfiguration", rpcService, logService);

		// this.#initDataSnapshot is for the initial values if provided, #currentConfigurationState is the live one.
		if (initData?.configuration?.values) {
			this.#initDataSnapshot = JSON.parse(
				JSON.stringify(initData.configuration.values),

				// Deep clone
			);

			this.#currentConfigurationState = JSON.parse(
				JSON.stringify(initData.configuration.values),
			);

			this._log(
				"Initial configuration cache populated from initData.configuration.values.",
			);
		} else {
			this._logWarn(
				"No initial configuration data (initData.configuration.values) provided. Cache starts empty.",
			);

			// TODO: If no initial snapshot, consider fetching configuration immediately after proxy is obtained.
			// This would make the first getConfiguration call more likely to return fresh data.
			// However, VS Code's ExtHostConfiguration often waits for $initializeConfiguration from main thread.
		}

		if (this._rpcService) {
			this.#mainThreadConfigurationProxy = this._getProxy(
				MainContext.MainThreadConfiguration as ProxyIdentifier<MainThreadConfigurationProxyShape>,
			);
		}

		if (this.#mainThreadConfigurationProxy)
			this._log("MainThreadConfiguration RPC proxy obtained.");
		else
			this._logError(
				"MainThreadConfiguration RPC proxy NOT obtained. Configuration features will be impaired.",
			);

		// Subscribe to `$acceptConfigurationChanged` IPC event from Mountain
		// Mountain sends: [MountainConfigNotificationPayload, MountainConfigChangeDetails | undefined]
		ipc.onConfigurationChanged(
			([newConfigPayload, changeDetails]: [
				MountainConfigNotificationPayload,
				MountainConfigChangeDetails | undefined,
			]) => {
				const affectedKeys = changeDetails?.keys || [];

				// Currently empty from Mountain example
				const affectedOverrides = changeDetails?.overrides || [];

				this._log(
					`IPC $acceptConfigurationChanged: Affected keys: [${affectedKeys.join(", ")}]. Overrides: ${affectedOverrides.length}`,
				);

				try {
					this.#currentConfigurationState =
						// Update internal live cache
						newConfigPayload?.values || {};

					this._log(
						"Internal configuration cache updated from notification.",
					);
				} catch (parseError: any) {
					this._logError(
						"Failed to update configuration cache from notification data:",

						parseError,
					);

					// Don't fire event if data is bad
					return;
				}

				const allEffectivelyAffectedKeys = new Set<string>(
					affectedKeys,
				);

				// If affectedOverrides has data, add those keys too. Mountain currently sends empty.
				affectedOverrides.forEach(([_identifier, overrideKeys]) => {
					overrideKeys.forEach((key) =>
						allEffectivelyAffectedKeys.add(key),
					);
				});

				const eventArg: VscodeConfigurationChangeEvent = {
					affectsConfiguration: (
						section: string,

						scope?: VscodeUri,
					): boolean => {
						if (scope) {
							// TODO: Implement full scope checking for affectsConfiguration if needed.
							this._logWarnOnce(
								`ConfigurationChangeEvent.affectsConfiguration scope checking is NOT fully implemented for scope: ${scope.toString()}`,
							);
						}

						if (
							section === undefined ||
							section === null ||
							section === ""
						)
							// Any change affects root
							return true;

						for (const key of allEffectivelyAffectedKeys) {
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

					// Use Node EventEmitter.emit
				);

				this._log("Fired public onDidChangeConfiguration event.");
			},
		);

		this._log("Subscribed to IPC configuration change events.");
	}

	// --- VscodeExtHostConfigurationShape Methods (called by MainThread) ---
	public $initializeConfiguration(data: IConfigurationInitData): void {
		this._log(
			`RPC $initializeConfiguration received with effective keys: ${Object.keys(data.effective || {}).length}`,
		);

		// This is the primary way VS Code's ExtHostConfiguration gets its initial state.
		// It contains more than just `values`: also `target`, `memory`, `data` (model).
		// For this shim, we primarily care about `data.effective` which is the merged config.
		this.#currentConfigurationState = JSON.parse(
			JSON.stringify(data.effective || {}),

			// Deep clone
		);

		this.#initDataSnapshot = JSON.parse(
			JSON.stringify(data.effective || {}),

			// Update initial snapshot too
		);

		this._log(
			"Configuration cache initialized/updated via $initializeConfiguration RPC.",
		);

		// TODO: If there are pending getConfiguration calls, they might need to be re-resolved or this event might unblock them.
		// Consider if an initial onDidChangeConfiguration event should fire if this differs from constructor init.
	}

	public $acceptConfigurationChanged(
		data: IConfigurationInitData,

		change: IConfigurationChange,
	): void {
		this._log(
			`RPC $acceptConfigurationChanged received. Changed keys: [${change.keys.join(", ")}]`,
		);

		this.#currentConfigurationState = JSON.parse(
			JSON.stringify(data.effective || {}),

			// Update with new effective config
		);

		const eventArg: VscodeConfigurationChangeEvent = {
			affectsConfiguration: (
				section: string,

				scope?: VscodeUri,
			): boolean => {
				// Use the keys from IConfigurationChange for affectsConfiguration
				// Also consider change.overrides if it's populated
				if (scope) {
					this._logWarnOnce(
						`ConfigurationChangeEvent.affectsConfiguration with scope not fully implemented.`,
					);

					// For scoped affects, one would check if any of `change.overrides` match the scope
					// and contain the section.
				}

				for (const key of change.keys) {
					if (
						section === undefined ||
						section === null ||
						section === ""
					)
						return true;

					if (key === section || key.startsWith(section + "."))
						return true;
				}

				// Check if any override change affects the section
				if (change.overrides) {
					for (const override of change.overrides) {
						// override.identifiers can be resource URIs or language IDs
						// This logic needs to be more sophisticated to match VS Code
						if (
							scope &&
							override.identifiers.some(
								(id) =>
									id === scope.toString() ||
									id === (scope as any).languageId,
							)
						) {
							for (const key of override.keys) {
								if (
									section === undefined ||
									section === null ||
									section === ""
								)
									return true;

								if (
									key === section ||
									key.startsWith(section + ".")
								)
									return true;
							}
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
			"Fired public onDidChangeConfiguration event via RPC update.",
		);
	}

	// --- vscode.workspace.getConfiguration API ---
	public async getConfiguration(
		section?: string,

		scope?: VscodeConfigurationScope,

		// Not used by ExtHostConfiguration directly for get
		// _extensionId?: ExtensionIdentifier
	): Promise<VscodeWorkspaceConfiguration> {
		let resource: VscodeUri | undefined = undefined;

		let languageId: string | undefined = undefined;

		if (scope instanceof VscodeUri) {
			resource = scope;
		} else if (scope && typeof scope === "object") {
			resource = scope.uri;

			languageId = scope.languageId;
		}

		const scopeUriStr =
			resource?.toString() ??
			// For logging
			(typeof scope === "string" ? scope : "undefined");

		// Can be verbose
		// this._log(`getConfiguration: section='${section}', scopeUri='${scopeUriStr}', langId='${languageId}'`);

		if (!this.#mainThreadConfigurationProxy) {
			this._logError(
				"Cannot getConfiguration: RPC proxy unavailable. Using potentially stale/initial cache.",
			);

			const relevantCache = this._getSectionFromCache(
				this.#currentConfigurationState || this.#initDataSnapshot,

				section,
			);

			return this._createShimVscodeWorkspaceConfiguration(
				relevantCache || {},

				section || "",
			);
		}

		let configValues: any = {};

		try {
			// Convert VscodeUri to UriComponents DTO for RPC
			const resourceDto = resource
				? (this._convertApiArgToInternal(
						resource,
					) as IConfigurationOverridesDto["resource"])
				: undefined;

			const overridesDto: IConfigurationOverridesDto = {
				resource: resourceDto,

				languageId,
			};

			// Mountain's MainThreadConfigurationHandler::getConfiguration expects [section, overrides, scopeToLanguage]
			// scopeToLanguage is not directly exposed on vscode.workspace.getConfiguration.
			// It's an internal detail for how configuration is fetched for a specific language scope without a resource.
			// For now, pass undefined.
			configValues =
				await this.#mainThreadConfigurationProxy.$getConfiguration([
					section || null,

					overridesDto,

					undefined,
				]);

			// this._log(`getConfiguration received ${Object.keys(configValues || {}).length} top-level keys.`);
		} catch (error: any) {
			const refinedError = refineError(
				error,

				this._logService,

				`getConfiguration(${section})`,
			);

			this._logError(
				`getConfiguration RPC failed for section='${section}', scope='${scopeUriStr}':`,

				refinedError,
			);

			this._logWarn(
				"Falling back to cached configuration due to RPC error.",
			);

			const relevantCache = this._getSectionFromCache(
				this.#currentConfigurationState || this.#initDataSnapshot,

				section,
			);

			configValues = relevantCache || {};
		}

		return this._createShimVscodeWorkspaceConfiguration(
			configValues || {},

			section || "",
		);
	}

	private _getSectionFromCache(fullConfig: any, section?: string): any {
		// Return full object if no section
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
				return undefined;
			}
		}

		return current;
	}

	private _createShimVscodeWorkspaceConfiguration(
		configSnapshotValues: any,

		sectionPrefix: string,
	): VscodeWorkspaceConfiguration {
		// `configSnapshotValues` is the set of values for the current section (or all if sectionPrefix is empty)
		const lookupValue = <T>(key: string): T | undefined => {
			// If key is empty, we are asking for the root of this configuration snapshot
			if (!key) {
				try {
					return typeof configSnapshotValues === "object" &&
						configSnapshotValues !== null
						? JSON.parse(JSON.stringify(configSnapshotValues))
						: configSnapshotValues;
				} catch (e: any) {
					this._logWarn(
						`Failed to deep clone section root for '${sectionPrefix}':`,

						e,
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
				return typeof current === "object" && current !== null
					? JSON.parse(JSON.stringify(current))
					: current;
			} catch (e: any) {
				this._logWarn(
					`Failed to deep clone config value for '${sectionPrefix ? sectionPrefix + "." : ""}${key}':`,

					e,
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

						defaultLanguageValue?: T;

						globalLanguageValue?: T;

						workspaceLanguageValue?: T;

						workspaceFolderLanguageValue?: T;

						languageIds?: string[];
				  }
				| undefined
			> => {
				const fullKeyToInspect = sectionPrefix
					? `${sectionPrefix}.${key}`
					: key;

				// this._log(`Configuration.inspect: key='${fullKeyToInspect}'`);

				if (!this.#mainThreadConfigurationProxy) {
					this._logError(
						"Cannot inspect configuration: RPC proxy unavailable.",
					);

					return undefined;
				}

				try {
					// Mountain's MainThreadConfigurationHandler::inspect expects `args: Value` where args[0] is the key string.
					// The protocol defines $inspect(keys: string[]), implying an array.
					// Let's align with passing an array.
					const inspectResultMap =
						await this.#mainThreadConfigurationProxy.$inspect([
							[fullKeyToInspect],
						]);

					const inspectInfo = inspectResultMap
						? inspectResultMap[fullKeyToInspect]
						: // Result is a map
							undefined;

					if (!inspectInfo) {
						// this._logWarn(`Configuration.inspect for key='${fullKeyToInspect}' returned no info.`);

						return undefined;
					}

					// TODO: Revive any UriComponents within inspectInfo if present (e.g., for languageIds if they were URIs, though unlikely).
					return typeof inspectInfo === "object" &&
						inspectInfo !== null
						? JSON.parse(JSON.stringify(inspectInfo))
						: inspectInfo;
				} catch (error: any) {
					const refinedError = refineError(
						error,

						this._logService,

						`inspect(${fullKeyToInspect})`,
					);

					this._logError(
						`Configuration.inspect RPC failed for key='${fullKeyToInspect}':`,

						refinedError,
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

				overrideInLanguage?: boolean,
			): Promise<void> => {
				// vscode.d.ts: update(section: string, value: any, configurationTarget?: ConfigurationTarget | boolean | null, overrideInLanguage?: boolean | ConfigurationScope | null): Thenable<void>;

				// The 4th param `overrideInLanguage` can be a boolean OR a ConfigurationScope. This is tricky.
				const fullKeyToUpdate = sectionPrefix
					? `${sectionPrefix}.${key}`
					: key;

				let targetDto: ConfigurationTargetDto | null | undefined = null;

				let overridesDto: IConfigurationOverridesDto | null = null;

				let scopeToLangDto: boolean | undefined = undefined;

				// Determine targetDto from configurationTargetOrScope (3rd arg)
				if (configurationTargetOrScope === true)
					targetDto = ConfigurationTargetDto.Global;
				else if (configurationTargetOrScope === false)
					// Or WorkspaceFolder if a scope is also given
					targetDto = ConfigurationTargetDto.Workspace;
				else if (
					typeof configurationTargetOrScope === "number" &&
					Object.values(VscodeConfigurationTarget).includes(
						configurationTargetOrScope,
					)
				) {
					// Map VscodeConfigurationTarget (API enum) to ConfigurationTargetDto (protocol enum)
					// TODO: Ensure these enum values align or map correctly.
					// Assuming direct cast for now.
					if (
						configurationTargetOrScope ===
						VscodeConfigurationTarget.Global
					)
						targetDto = ConfigurationTargetDto.Global;
					else if (
						configurationTargetOrScope ===
						VscodeConfigurationTarget.Workspace
					)
						targetDto = ConfigurationTargetDto.Workspace;
					else if (
						configurationTargetOrScope ===
						VscodeConfigurationTarget.WorkspaceFolder
					)
						targetDto = ConfigurationTargetDto.WorkspaceFolder;
				} else if (
					typeof configurationTargetOrScope === "object" &&
					configurationTargetOrScope !== null
				) {
					// If 3rd arg is ConfigurationScope object, it defines overrides, and target might be implicit
					const scope = configurationTargetOrScope as {
						uri?: VscodeUri;

						languageId?: string;
					};

					overridesDto = {
						resource: scope.uri
							? (this._convertApiArgToInternal(
									scope.uri,
								) as IConfigurationOverridesDto["resource"])
							: undefined,

						languageId: scope.languageId,
					};

					// If scope has URI, target is likely WorkspaceFolder, else Workspace (if not global)
					targetDto = scope.uri
						? ConfigurationTargetDto.WorkspaceFolder
						: ConfigurationTargetDto.Workspace;
				}

				// Handle overrideInLanguage (4th arg)
				if (typeof overrideInLanguage === "boolean") {
					scopeToLangDto = overrideInLanguage;

					if (
						overrideInLanguage &&
						!overridesDto?.languageId &&
						typeof configurationTargetOrScope === "object" &&
						(configurationTargetOrScope as any)?.languageId
					) {
						// If overrideInLanguage is true and languageId was in the 3rd arg (as ConfigurationScope)
						// this is complex. VS Code's extHostConfiguration needs careful checking here.
						// Most common use: target is enum/boolean, scopeOverride (4th) is ConfigurationScope {uri, langId}

						this._logWarn(
							"Complex overrideInLanguage=boolean with 3rd arg as scope object - review needed.",
						);
					}
				} else if (
					typeof overrideInLanguage === "object" &&
					overrideInLanguage !== null
				) {
					// 4th arg is ConfigurationScope, use it for overrides.
					const scope = overrideInLanguage as {
						uri?: VscodeUri;

						languageId?: string;
					};

					overridesDto = {
						resource: scope.uri
							? (this._convertApiArgToInternal(
									scope.uri,
								) as IConfigurationOverridesDto["resource"])
							: undefined,

						languageId: scope.languageId,
					};

					if (!targetDto) {
						// If 3rd arg was null/undefined, infer target from this scope
						targetDto = scope.uri
							? ConfigurationTargetDto.WorkspaceFolder
							: ConfigurationTargetDto.Workspace;
					}
				}

				// Default target if still not set (e.g. 3rd and 4th args were undefined/null)
				if (targetDto === null || targetDto === undefined) {
					targetDto = overridesDto?.resource
						? ConfigurationTargetDto.WorkspaceFolder
						: ConfigurationTargetDto.Global;

					this._logWarn(
						`Configuration.update: No explicit target, defaulting to ${ConfigurationTargetDto[targetDto]}.`,
					);
				}

				// this._log(`Configuration.update: key='${fullKeyToUpdate}', target=${targetDto}, overrides=${JSON.stringify(overridesDto)}, scopeToLang=${scopeToLangDto}`);

				if (!this.#mainThreadConfigurationProxy) {
					const msg =
						"Cannot update configuration: RPC proxy unavailable.";

					this._logError(msg);

					throw new Error(msg);
				}

				try {
					await this.#mainThreadConfigurationProxy.$updateConfigurationOption(
						[
							targetDto,

							fullKeyToUpdate,

							value,

							overridesDto,

							scopeToLangDto,
						],
					);

					// this._log(`Configuration.update successful for key='${fullKeyToUpdate}'`);

					// Configuration is updated on main thread; this ExtHost cache will be updated via $acceptConfigurationChanged.
				} catch (error: any) {
					const refinedError = refineError(
						error,

						this._logService,

						`update(${fullKeyToUpdate})`,
					);

					this._logError(
						`Configuration.update RPC failed for key='${fullKeyToUpdate}':`,

						refinedError,
					);

					throw refinedError;
				}
			},
		};

		// The Proxy for direct property access (e.g., config.editor.fontSize)
		// needs to correctly handle nested properties.
		return new Proxy(workspaceConfigShim, {
			get(target, prop: string | symbol, receiver) {
				if (
					prop in target ||
					typeof prop === "symbol" ||
					prop === "then" ||
					typeof prop === "function"
				) {
					return Reflect.get(target, prop, receiver);
				}

				if (typeof prop === "string") {
					// This should return a value if `prop` is a direct key in `configSnapshotValues`
					// OR it should return a new WorkspaceConfiguration object for the sub-section `prop`.
					// VS Code's behavior: config.get('editor').fontSize vs config.get('editor.fontSize')
					// If `config.editor` is accessed, it should be an object where `fontSize` can be accessed.
					// The current `lookupValue` gets the specific value.
					// To support `config.editor.fontSize`, the proxy needs to return an object
					// that itself can be queried, or a sub-WorkspaceConfiguration.

					// Simple approach for direct property access: just call get()
					// This means `config.editor` would be `config.get('editor')`.
					return target.get(prop);

					// More complex approach (to allow config.editor.fontSize):
					// const subConfigValue = lookupValue<any>(prop);

					// if (typeof subConfigValue === 'object' && subConfigValue !== null && !Array.isArray(subConfigValue)) {

					// Create a new WorkspaceConfiguration for the sub-section
					//
					//     const newSectionPrefix = sectionPrefix ? `${sectionPrefix}.${prop}` : prop;

					//     return this._createShimVscodeWorkspaceConfiguration(subConfigValue, newSectionPrefix);

					// }

					// return subConfigValue;
				}

				return Reflect.get(target, prop, receiver);
			},

			has(target, prop: string | symbol) {
				// Check if `target` (workspaceConfigShim) has the property
				if (prop in target || typeof prop === "symbol")
					return Reflect.has(target, prop);

				// Calls target.has(prop)
				if (typeof prop === "string") return target.has(prop);

				return Reflect.has(target, prop);
			},
		}) as VscodeWorkspaceConfiguration;
	}

	// --- Event ---
	get onDidChangeConfiguration(): VscodeEvent<VscodeConfigurationChangeEvent> {
		return this._createEventFromEmitter<VscodeConfigurationChangeEvent>(
			this.#onDidChangeConfigurationEmitter,

			"fire",
		);
	}

	// --- For NodeRequireInterceptor (VSCodeNodeModuleFactory) ---
	public async getConfigProvider(): Promise<any /* IExtHostConfigurationProvider */> {
		// This method is used by VS Code's require interceptor to get a config provider for `vscode.workspace.getConfiguration`.
		// It should return an object that has a `getConfiguration` method.
		// This `ShimExtHostConfiguration` class itself can serve as that provider.
		return {
			getConfiguration: (
				section?: string,

				scope?: VscodeConfigurationScope,

				extensionId?: ExtensionIdentifier,
			) => {
				return this.getConfiguration(section, scope /*, extensionId */);
			},
		};
	}
}
