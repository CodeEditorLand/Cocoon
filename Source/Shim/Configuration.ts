/*
 * File: Cocoon/Source/Shim/Configuration.ts
 * Responsibility: Implements the VS Code configuration API shim for the Cocoon sidecar, enabling extensions to access and modify configuration settings while bridging to the Mountain backend via IPC.
 * Modified: 2025-06-07 00:57:46 UTC
 * Dependency: ../cocoon-ipc, events, vs/base/common/event, vs/base/common/marshalling, vs/base/common/objects, vs/platform/configuration/common/configurationRegistry, vs/platform/extensions/common/extensions
 * Export: ShimExtHostConfiguration
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Configuration Shim
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.workspace.getConfiguration` API, allowing extensions to access
 * configuration settings. This shim acts as the ExtHost-side representation of the
 * configuration service, fulfilling the `IExtHostConfiguration` interface.
 *
 * It maintains an internal cache of the current effective configuration state. This cache
 * is initialized from data provided by Mountain (`initData` from main ExtHostInitData) and
 * is kept up-to-date through RPC calls from Mountain (e.g., `$initializeConfiguration`,
 * `$acceptConfigurationChanged`) or via direct IPC events (`ipc.onConfigurationChanged`).
 * The `$initializeConfiguration` RPC call provides the full, authoritative configuration model.
 *
 * When an extension calls `vscode.workspace.getConfiguration(section?, scope?)`, this service:
 * - Fetches the relevant configuration values from Mountain via RPC if a proxy is available.
 * - Returns a `vscode.WorkspaceConfiguration` object.
 *
 * The returned `WorkspaceConfiguration` object:
 * - Implements methods like `get()`, `has()`, `inspect()`, and `update()`.
 * - For `get()` and `has()`, it reads from a snapshot of the configuration values
 *   obtained for the specified section and scope. These values are deep-cloned.
 * - For `inspect()` and `update()`, it proxies these operations to the
 *   `MainThreadConfiguration` service on Mountain via RPC calls.
 *
 * This shim also handles the `vscode.workspace.onDidChangeConfiguration` event, firing it
 * when configuration changes are received from Mountain. Additionally, it provides a
 * `getConfigProvider()` method used by the `NodeRequireInterceptor`.
 *
 * Key Interactions:
 * - An instance of `ShimExtHostConfiguration` is registered with DI in `Cocoon/index.ts`.
 * - Communicates with `MainContext.MainThreadConfiguration` on Mountain via RPC.
 * - Receives configuration updates via `$initializeConfiguration` (full model) and
 *   `$acceptConfigurationChanged` (delta with new effective state) RPC calls,
 *   and can also receive updates via direct IPC (`ipc.onConfigurationChanged`).
 * - Uses `BaseCocoonShim` for common utilities.
 *
 * Last Reviewed/Updated: Based on latest merge timestamp.
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter } from "events"; // Node.js EventEmitter
import { type Event as VscodeEvent } from "vs/base/common/event";
import { MarshalledId } from "vs/base/common/marshalling";
import { deepClone } from "vs/base/common/objects";
import { ConfigurationScope } from "vs/platform/configuration/common/configurationRegistry";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions";
import {
	ConfigurationTargetDto,
	ExtHostContext,
	MainContext,
	type IConfigurationChange,
	type IConfigurationOverridesDto,
	type IConfigurationInitData as RpcConfigurationInitData,
	type ExtHostConfigurationShape as VscodeExtHostConfigurationShape,
	type UriComponents as VSCodeInternalUriComponents,
	type MainThreadConfigurationShape as VscodeMainThreadConfigurationShape,
} from "vs/workbench/api/common/extHost.protocol";

import * as ipc from "../cocoon-ipc";
import {
	Uri as VscodeApiUri,
	ConfigurationTarget as VscodeConfigurationTarget,
	type ConfigurationChangeEvent as VscodeConfigurationChangeEvent,
	type WorkspaceConfiguration as VscodeWorkspaceConfiguration,
} from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

interface MainThreadConfigurationProxyShape
	extends VscodeMainThreadConfigurationShape {
	// VS Code's protocol might not have this; it handles deletion by value: null in $updateConfigurationOption
	// This is kept for logical clarity if a specific remove RPC was added, but standard VS Code uses update with null.
	$removeConfigurationOption?(
		target: ConfigurationTargetDto | null | undefined,
		key: string,
		overrides: IConfigurationOverridesDto | null,
		// scopeToLanguage was a misinterpretation of internal VS Code details. The protocol
		// uses overrideIdentifier (languageId) within IConfigurationOverridesDto for language-specific settings.
	): Promise<void>;
}

interface IpcConfigurationChangedPayload {
	data: RpcConfigurationInitData; // Full new effective state
	change: IConfigurationChange; // Delta of changes
}

type VscodeConfigurationScope =
	| VscodeApiUri
	| { uri?: VscodeApiUri; languageId?: string }
	| null
	| undefined;

export class ShimExtHostConfiguration
	extends BaseCocoonShim
	implements VscodeExtHostConfigurationShape
{
	public readonly _serviceBrand: undefined;
	#mainThreadConfigurationProxy: MainThreadConfigurationProxyShape | null =
		null;
	#currentConfigurationState: any = {}; // Stores the effective configuration values
	readonly #onDidChangeConfigurationEmitter = new EventEmitter();
	#configurationKeyScopes: Map<string, ConfigurationScope | undefined> =
		new Map();

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		initialConfigDataFromMainInit: RpcConfigurationInitData | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostConfiguration", rpcService, logService);
		this._logInfo("Initializing...");

		if (initialConfigDataFromMainInit?.effective) {
			this.#currentConfigurationState = deepClone(
				initialConfigDataFromMainInit.effective,
			);
			this._logInfo(
				"Initial configuration cache populated from main ExtHostInitData.effective.",
			);
		} else {
			this._logWarn(
				"No initial config in main ExtHostInitData. Cache starts empty, awaiting $initializeConfiguration RPC.",
			);
		}
		if (initialConfigDataFromMainInit?.configurationScopes) {
			this.#configurationKeyScopes = new Map(
				initialConfigDataFromMainInit.configurationScopes,
			);
			this._logDebug(
				`Initialized with ${this.#configurationKeyScopes.size} configuration scope definitions from main ExtHostInitData.`,
			);
		}

		if (this._rpcService) {
			this.#mainThreadConfigurationProxy = this._getProxy(
				MainContext.MainThreadConfiguration as ProxyIdentifier<MainThreadConfigurationProxyShape>,
			);
			if (this.#mainThreadConfigurationProxy) {
				this._logDebug("MainThreadConfiguration RPC proxy obtained.");
			} else {
				this._logError(
					"Failed to obtain MainThreadConfiguration RPC proxy. Configuration features will be impaired.",
				);
			}
			// Registration for RPC calls FROM MainThread is typically done in the DI setup
			// by calling this._rpcService.set(ExtHostContext.ExtHostConfiguration, thisInstance).
			// If doing it here, it should be conditional on _rpcService.
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
					"Failed to set self for RPC (ExtHostConfiguration):",
					e,
				);
			}
		} else {
			this._logError(
				"RPCService Adapter unavailable. Cannot proxy to MainThreadConfiguration or receive RPC updates.",
			);
		}

		this._instanceDisposables.add(
			ipc.onConfigurationChanged(
				(payload: IpcConfigurationChangedPayload) => {
					this._logDebug(
						"Direct IPC configuration update received via 'onConfigurationChanged'.",
					);
					if (
						!payload ||
						!payload.data ||
						typeof payload.data.effective !== "object"
					) {
						this._logError(
							"IPC onConfigurationChanged: Invalid payload.data.effective.",
							payload,
						);
						return;
					}
					// This payload contains the new full state (data.effective) and the change delta (change).
					// We should update our effective state and then fire the change event.
					this.#currentConfigurationState = deepClone(
						payload.data.effective || {},
					);
					if (payload.data.configurationScopes) {
						this.#configurationKeyScopes = new Map(
							payload.data.configurationScopes,
						);
					}
					this._fireChangeEvent(payload.change);
				},
			),
		);
		this._logInfo(
			"Subscribed to direct IPC configuration change events ('onConfigurationChanged').",
		);
	}

	private _fireChangeEvent(changeDetails: IConfigurationChange): void {
		const affectedKeysForEvent = new Set<string>(changeDetails.keys);
		// According to VS Code's IConfigurationChange, `overrides` is:
		// override: [overrideIdentifier: string, keys: string[]][]
		changeDetails.overrides?.forEach(
			([_overrideIdentifier, overrideKeys]) => {
				overrideKeys.forEach((key) => affectedKeysForEvent.add(key));
			},
		);

		const eventArg: VscodeConfigurationChangeEvent = {
			affectsConfiguration: (
				section: string,
				scope?: VscodeApiUri, // Note: VS Code's API type for scope here is `ConfigurationScope`
			): boolean => {
				if (scope) {
					// `scope` here is resource URI if provided
					this._logWarnOnce(
						`ConfigurationChangeEvent.affectsConfiguration called with a resource scope for section '${section}'. Scope-aware checking is basic. Scope: ${scope.toString()}`,
					);
					// More advanced checking would involve comparing the scope with changeDetails.affectedKeysFromTrigger.
					// For now, if a scope is passed, and *any* key matching the section is affected, assume true.
				}
				if (!section) return true; // Affects all if no section
				for (const key of affectedKeysForEvent) {
					if (key === section || key.startsWith(section + "."))
						return true;
				}
				return false;
			},
		};

		this.#onDidChangeConfigurationEmitter.emit(
			"fire",
			Object.freeze(eventArg),
		);
		const changedKeysSummary = Array.from(affectedKeysForEvent).join(", ");
		this._logInfo(
			`Fired public onDidChangeConfiguration event. Changed keys summary: [${changedKeysSummary.substring(0, 100)}...]`,
		);
	}

	// --- RPC Methods Called BY MainThread/Mountain ---
	public $initializeConfiguration(dataDto: RpcConfigurationInitData): void {
		this._logInfo(
			`RPC $initializeConfiguration received. Effective keys count: ${Object.keys(dataDto.effective || {}).length}. Replacing local cache.`,
		);
		this.#currentConfigurationState = deepClone(dataDto.effective || {});
		if (dataDto.configurationScopes) {
			this.#configurationKeyScopes = new Map(dataDto.configurationScopes);
			this._logDebug(
				`Updated with ${this.#configurationKeyScopes.size} configuration scope definitions from $initializeConfiguration.`,
			);
		} else {
			this.#configurationKeyScopes.clear();
			this._logWarn(
				"No configurationScopes received in $initializeConfiguration. Scopes map cleared.",
			);
		}
		// Note: The first full initialization from Mountain should generally NOT fire an onDidChangeConfiguration event,
		// as extensions wouldn't have had a chance to register listeners yet.
		// If this is called later for a full refresh, it implies a major reset, and changes might be too broad
		// for a granular event. $acceptConfigurationChanged is preferred for deltas.
		this._logInfo(
			"Full configuration cache (re)initialized via $initializeConfiguration RPC from Mountain.",
		);
	}

	public $acceptConfigurationChanged(
		data: RpcConfigurationInitData, // Contains the new full 'effective' configuration state
		change: IConfigurationChange, // Contains 'keys' and 'overrides' detailing what changed
	): void {
		const changedKeysSummary = change.keys.join(", ");
		this._logInfo(
			`RPC $acceptConfigurationChanged received. Changed keys: [${changedKeysSummary.substring(0, 100)}...], Overrides: ${change.overrides?.length ?? 0}`,
		);
		this.#currentConfigurationState = deepClone(data.effective || {}); // Update local cache to new full state
		if (data.configurationScopes) {
			// Update scopes if they changed
			this.#configurationKeyScopes = new Map(data.configurationScopes);
		}
		this._fireChangeEvent(change); // Fire event with the delta
	}

	// --- vscode.workspace.getConfiguration API Implementation ---
	public async getConfiguration(
		section?: string,
		scope?: VscodeConfigurationScope,
		extensionIdForValidationLog?: ExtensionIdentifier,
	): Promise<VscodeWorkspaceConfiguration> {
		let resourceFromScope: VscodeApiUri | undefined = undefined;
		let languageIdFromScope: string | undefined = undefined;

		if (scope instanceof VscodeApiUri) {
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
			: languageIdFromScope || "global_or_window";
		this._logDebug(
			`API getConfiguration: Section='${section || "(root)"}', Scope='${scopeForLog}', Extension='${extensionIdForValidationLog?.value || "N/A"}'`,
		);

		if (!this.#mainThreadConfigurationProxy) {
			this._logError(
				"getConfiguration: MainThreadConfiguration RPC proxy unavailable. Using stale local cache for all operations.",
			);
			const cachedSectionValues = this._getSectionFromCache(
				this.#currentConfigurationState,
				section,
			);
			return this._createShimVscodeWorkspaceConfiguration(
				cachedSectionValues || {},
				section || "",
				scope,
				extensionIdForValidationLog,
				true,
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
				overrideIdentifier: languageIdFromScope,
			};
			// VS Code's $getConfiguration expects a tuple argument: [section, overridesDto, extensionId (optional for main thread)]
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
				`getConfiguration RPC call failed for Section='${section || "(root)"}'. Error: ${refinedError.message}. Falling back to local cache.`,
			);
			const cachedSectionValues = this._getSectionFromCache(
				this.#currentConfigurationState,
				section,
			);
			configValuesFromMain = cachedSectionValues || {}; // Use cached if RPC fails
		}
		return this._createShimVscodeWorkspaceConfiguration(
			configValuesFromMain || {},
			section || "",
			scope,
			extensionIdForValidationLog,
		);
	}

	private _getSectionFromCache(fullConfig: any, section?: string): any {
		if (!section) return fullConfig; // Return the whole config if no section
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

	private _createShimVscodeWorkspaceConfiguration(
		configSnapshotValues: any, // Values for the specific section and scope from MainThread or cache
		sectionPrefix: string,
		originalScope?: VscodeConfigurationScope,
		extensionIdForValidationLog?: ExtensionIdentifier,
		isProxyUnavailable = false, // Flag if proxy was down when this snapshot was created
	): VscodeWorkspaceConfiguration {
		const self = this; // For use in closures

		const lookupValue = <T>(key: string): T | undefined => {
			const fullKey = sectionPrefix ? `${sectionPrefix}.${key}` : key;
			this._validateConfigurationAccess(
				fullKey,
				originalScope,
				extensionIdForValidationLog,
			);

			let current = configSnapshotValues;
			// If key is empty, we want the root of the snapshot (which is already section-specific)
			if (!key) {
				return typeof current === "object" && current !== null
					? deepClone(current)
					: current;
			}

			// Traverse the snapshot for the sub-key
			for (const part of key.split(".")) {
				if (
					current &&
					typeof current === "object" &&
					current !== null &&
					Object.prototype.hasOwnProperty.call(current, part)
				) {
					current = current[part];
				} else {
					return undefined; // Sub-key part not found
				}
			}
			// Deep clone objects/arrays to prevent modification of the snapshot
			return typeof current === "object" && current !== null
				? deepClone(current)
				: current;
		};

		const workspaceConfigShim: VscodeWorkspaceConfiguration = {
			get: <T>(key: string, defaultValue?: T): T | undefined => {
				const value = lookupValue<T>(key);
				return value !== undefined ? value : defaultValue;
			},
			has: (key: string): boolean => {
				// Check if the key exists, even if its value is undefined.
				// This differs slightly from lookupValue which returns undefined if not found.
				const fullKey = sectionPrefix ? `${sectionPrefix}.${key}` : key;
				this._validateConfigurationAccess(
					fullKey,
					originalScope,
					extensionIdForValidationLog,
				);
				let current = configSnapshotValues;
				if (!key) return configSnapshotValues !== undefined; // For root of section

				const parts = key.split(".");
				for (let i = 0; i < parts.length; i++) {
					const part = parts[i];
					if (
						current &&
						typeof current === "object" &&
						current !== null &&
						Object.prototype.hasOwnProperty.call(current, part)
					) {
						if (i === parts.length - 1) return true; // Last part and it exists
						current = current[part];
					} else {
						return false; // Part not found
					}
				}
				return false; // Should not be reached if key is valid path
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
				if (
					isProxyUnavailable ||
					!self.#mainThreadConfigurationProxy?.$inspectConfiguration
				) {
					self._logError(
						"Cannot inspect configuration: RPC proxy or $inspectConfiguration method unavailable.",
					);
					return undefined;
				}
				const fullKeyToInspect = sectionPrefix
					? `${sectionPrefix}.${key}`
					: key;
				const resourceFromScope =
					originalScope instanceof VscodeApiUri
						? originalScope
						: typeof originalScope === "object" &&
							  originalScope?.uri instanceof VscodeApiUri
							? originalScope.uri
							: undefined;
				const languageIdFromScope =
					typeof originalScope === "object" &&
					originalScope?.languageId
						? originalScope.languageId
						: undefined;
				const resourceDto = resourceFromScope
					? (self._convertApiArgToInternal(
							resourceFromScope,
						) as VSCodeInternalUriComponents)
					: undefined;

				try {
					// $inspectConfiguration args: [resourceDto | null, languageId | null, keyToInspect]
					const inspectInfo =
						await self.#mainThreadConfigurationProxy.$inspectConfiguration(
							resourceDto ?? null,
							languageIdFromScope ?? null,
							fullKeyToInspect,
						);
					// The result from protocol is already the DTO, no need to convert from API type.
					// We need to revive any URIs within the result.
					return inspectInfo
						? deepClone(this._reviveInspectResult(inspectInfo))
						: undefined;
				} catch (error: any) {
					self._logError(
						`Configuration.inspect RPC call for key='${fullKeyToInspect}' failed:`,
						refineErrorForShim(
							error,
							self._logService,
							`inspect(${fullKeyToInspect})`,
						),
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
					const msg = `Cannot update config key='${key}': RPC proxy unavailable.`;
					self._logError(msg);
					throw new Error(msg);
				}
				const fullKeyToUpdate = sectionPrefix
					? `${sectionPrefix}.${key}`
					: key;

				let targetArg: ConfigurationTargetDto | undefined;
				let resourceArg: VscodeApiUri | undefined;
				let languageIdArg: string | undefined;
				// This logic determines the ConfigurationTarget and override scope based on complex VS Code API overloading.
				// Note: scopeToLanguage boolean is mostly deprecated in favor of explicit languageId in scope object.

				if (typeof configurationTargetOrScope === "number") {
					// VscodeConfigurationTarget
					targetArg =
						configurationTargetOrScope ===
						VscodeConfigurationTarget.Global
							? ConfigurationTargetDto.UserLocal
							: configurationTargetOrScope ===
								  VscodeConfigurationTarget.Workspace
								? ConfigurationTargetDto.Workspace
								: configurationTargetOrScope ===
									  VscodeConfigurationTarget.WorkspaceFolder
									? ConfigurationTargetDto.WorkspaceFolder
									: undefined; // Unknown target
					if (typeof overrideInLanguageOrScope === "boolean") {
						// scopeToLanguage (old form)
						if (overrideInLanguageOrScope === true) {
							// Target language scope at original resource
							resourceArg =
								originalScope instanceof VscodeApiUri
									? originalScope
									: typeof originalScope === "object" &&
										originalScope?.uri;
							languageIdArg =
								typeof originalScope === "object" &&
								originalScope?.languageId;
						}
					} else if (overrideInLanguageOrScope) {
						// VscodeConfigurationScope for language override
						resourceArg =
							overrideInLanguageOrScope instanceof VscodeApiUri
								? overrideInLanguageOrScope
								: overrideInLanguageOrScope.uri;
						languageIdArg = overrideInLanguageOrScope.languageId;
					}
				} else if (typeof configurationTargetOrScope === "boolean") {
					// globalOrWorkspace (deprecated boolean)
					targetArg = configurationTargetOrScope
						? ConfigurationTargetDto.UserLocal
						: ConfigurationTargetDto.Workspace;
					if (
						typeof overrideInLanguageOrScope === "boolean" &&
						overrideInLanguageOrScope === true
					) {
						resourceArg =
							originalScope instanceof VscodeApiUri
								? originalScope
								: typeof originalScope === "object" &&
									originalScope?.uri;
						languageIdArg =
							typeof originalScope === "object" &&
							originalScope?.languageId;
					}
				} else if (configurationTargetOrScope) {
					// VscodeConfigurationScope (no explicit target, implies scope-based target)
					resourceArg =
						configurationTargetOrScope instanceof VscodeApiUri
							? configurationTargetOrScope
							: configurationTargetOrScope.uri;
					languageIdArg = configurationTargetOrScope.languageId;
					// Target is inferred by MainThread based on resource/languageId.
				} else {
					// No explicit target or scope override args, use original scope context
					resourceArg =
						originalScope instanceof VscodeApiUri
							? originalScope
							: typeof originalScope === "object" &&
								originalScope?.uri;
					languageIdArg =
						typeof originalScope === "object" &&
						originalScope?.languageId;
				}

				const targetDto: ConfigurationTargetDto | null | undefined =
					targetArg;
				const overridesDto: IConfigurationOverridesDto | null = {
					resource: resourceArg
						? (self._convertApiArgToInternal(
								resourceArg,
							) as VSCodeInternalUriComponents)
						: undefined,
					overrideIdentifier: languageIdArg,
				};

				const valueForRpc = value === undefined ? null : value; // `null` signifies deletion
				const rpcCallPromise =
					valueForRpc === null &&
					self.#mainThreadConfigurationProxy!
						.$removeConfigurationOption
						? // $removeConfigurationOption expects: target, key, overridesDto (scopeToLanguage is not on protocol for this)
							self.#mainThreadConfigurationProxy!.$removeConfigurationOption(
								targetDto,
								fullKeyToUpdate,
								overridesDto,
								undefined,
							)
						: // $updateConfigurationOption expects a tuple: [target, key, value, overridesDto, scopeToLanguage (not on protocol)]
							self.#mainThreadConfigurationProxy!.$updateConfigurationOption(
								[
									targetDto,
									fullKeyToUpdate,
									valueForRpc,
									overridesDto,
									undefined,
								],
							);
				try {
					await rpcCallPromise;
				} catch (error: any) {
					self._logError(
						`Config.update RPC for key='${fullKeyToUpdate}' failed:`,
						refineErrorForShim(
							error,
							self._logService,
							`update(${fullKeyToUpdate})`,
						),
					);
					throw error; // Rethrow to extension
				}
			},
		};

		// Proxy to allow direct property access (e.g., config.mySetting)
		return new Proxy(workspaceConfigShim, {
			get(target, prop: string | symbol, receiver) {
				if (
					prop in target ||
					typeof prop === "symbol" ||
					prop === "then" ||
					typeof (target as any)[prop] === "function"
				) {
					return Reflect.get(target, prop, receiver);
				}
				if (typeof prop === "string") return target.get(prop); // Use .get() for property access
				return Reflect.get(target, prop, receiver);
			},
			has(target, prop: string | symbol) {
				if (prop in target || typeof prop === "symbol")
					return Reflect.has(target, prop);
				if (typeof prop === "string") return target.has(prop); // Use .has()
				return Reflect.has(target, prop);
			},
		}) as VscodeWorkspaceConfiguration;
	}

	private _reviveInspectResult(inspectInfo: any): any {
		if (!inspectInfo || typeof inspectInfo !== "object") return inspectInfo;
		const result: any = {};
		for (const key in inspectInfo) {
			if (Object.prototype.hasOwnProperty.call(inspectInfo, key)) {
				const value = inspectInfo[key];
				// Check for URI-like structures based on MarshalledId or common DTO shape
				if (
					value &&
					typeof value === "object" &&
					(value.$mid === MarshalledId.UriSimple ||
						value.$mid === MarshalledId.Uri ||
						(typeof value.scheme === "string" &&
							typeof value.path === "string" &&
							value.authority !== undefined))
				) {
					result[key] = this._reviveApiArgument(value);
				} else if (
					Array.isArray(value) &&
					key === "overrideIdentifiers" &&
					value.every((item) => typeof item === "string")
				) {
					// overrideIdentifiers is part of IConfigurationInspect<T> from protocol
					result[key] = value;
				} else if (typeof value === "object" && value !== null) {
					result[key] = this._reviveInspectResult(value); // Recurse for nested objects
				} else {
					result[key] = value;
				}
			}
		}
		return result;
	}

	private _validateConfigurationAccess(
		key: string,
		scope?: VscodeConfigurationScope | null,
		extensionId?: ExtensionIdentifier,
	): void {
		const configScopeMeta = this.#configurationKeyScopes.get(key);
		const extensionIdText = extensionId ? `[${extensionId.value}] ` : "";
		if (configScopeMeta === ConfigurationScope.RESOURCE) {
			let resourceDefined = false;
			if (scope instanceof VscodeApiUri) {
				resourceDefined = true;
			} else if (
				scope &&
				typeof scope === "object" &&
				scope.uri instanceof VscodeApiUri
			) {
				resourceDefined = true;
			}
			if (!resourceDefined) {
				this._logWarnOnce(
					`${extensionIdText}Accessing resource-scoped config '${key}' without a resource URI. Effective value might be unexpected. Provide a resource URI or ensure the scope implies one.`,
				);
			}
		} else if (configScopeMeta === ConfigurationScope.WINDOW) {
			// WINDOW scope means per-window, not tied to a resource
			let resourceDefined = false;
			if (scope instanceof VscodeApiUri) {
				resourceDefined = true;
			} else if (
				scope &&
				typeof scope === "object" &&
				scope.uri instanceof VscodeApiUri
			) {
				resourceDefined = true;
			}
			if (resourceDefined) {
				this._logWarnOnce(
					`${extensionIdText}Accessing window-scoped config '${key}' with a resource URI scope. Resource URI will be ignored for window-scoped settings.`,
				);
			}
		}
		// Other scopes (MACHINE, APPLICATION, MACHINE_OVERRIDABLE, LANGUAGE_OVERRIDABLE) have different implications
		// for scope argument, but the basic check for RESOURCE/WINDOW is most common for warnings.
	}

	get onDidChangeConfiguration(): VscodeEvent<VscodeConfigurationChangeEvent> {
		return this._createVscodeEventFromNodeEmitter<VscodeConfigurationChangeEvent>(
			this.#onDidChangeConfigurationEmitter,
			"fire",
		);
	}

	public async getConfigProvider(): Promise<{
		getConfiguration: ShimExtHostConfiguration["getConfiguration"];
	}> {
		return {
			getConfiguration: (
				section?: string,
				scopeOrExtensionId?:
					| VscodeConfigurationScope
					| ExtensionIdentifier,
				_actualExtensionIdIfSecondWasScope?: ExtensionIdentifier,
			): Promise<VscodeWorkspaceConfiguration> => {
				let actualScope: VscodeConfigurationScope | undefined =
					undefined;
				let extensionIdForValidationLog:
					| ExtensionIdentifier
					| undefined = _actualExtensionIdIfSecondWasScope;
				if (scopeOrExtensionId instanceof ExtensionIdentifier) {
					// Correctly check if it's an ExtensionIdentifier instance
					extensionIdForValidationLog = scopeOrExtensionId;
				} else {
					// Otherwise, it's a scope
					actualScope = scopeOrExtensionId as
						| VscodeConfigurationScope
						| undefined;
				}
				return this.getConfiguration(
					section,
					actualScope,
					extensionIdForValidationLog,
				);
			},
		};
	}

	public override dispose(): void {
		super.dispose();
		this.#onDidChangeConfigurationEmitter.removeAllListeners();
		this._logInfo("Disposed.");
	}
}
