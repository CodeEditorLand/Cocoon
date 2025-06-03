/*---------------------------------------------------------------------------------------------
 * Cocoon Configuration Shim (configuration-shim.ts)
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
 * - TODO: Consider adopting VS Code's internal `Configuration` model class for more robust
 *   handling of configuration data and `IConfigurationOverrides`.
 * - TODO: Centralize `vscode.ConfigurationScope` to `IConfigurationOverridesDto` conversion.
 *
 *--------------------------------------------------------------------------------------------*/

// Node.js EventEmitter
import { EventEmitter } from "events";
import {
	// Emitter as VscodeEmitter, // Not used directly in this file
	type Event as VscodeEvent,
} from "vs/base/common/event";
import { MarshalledId } from "vs/base/common/marshalling"; // For URI DTO $mid checks
import { deepClone } from "vs/base/common/objects"; // For deep cloning config values for `get`

import {
	ConfigurationScope, // For validating access
	// OVERRIDE_PROPERTY_REGEX, // Not directly used from here in the final version
} from "vs/platform/configuration/common/configurationRegistry";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions";
import {
	ConfigurationTargetDto,
	// ExtHostContext, // Registration moved to index.ts as per update
	MainContext,
	type IConfigurationChange,
	type IConfigurationOverridesDto,
	type IConfigurationInitData as RpcConfigurationInitData, // DTO from extHost.protocol
	type ExtHostConfigurationShape as VscodeExtHostConfigurationShape,
	type UriComponents as VSCodeInternalUriComponents, // For DTOs
	type MainThreadConfigurationShape as VscodeMainThreadConfigurationShape,
} from "vs/workbench/api/common/extHost.protocol";

// For direct IPC subscription
import * as ipc from "../cocoon-ipc";
// Public API types (ensure paths are correct for your build)
import {
	Uri as VscodeApiUri, // Use VscodeApiUri for public API types
	ConfigurationTarget as VscodeConfigurationTarget,
	type ConfigurationChangeEvent as VscodeConfigurationChangeEvent,
	type WorkspaceConfiguration as VscodeWorkspaceConfiguration,
} from "../Shim/out/vscode";
// Assuming this path is correct

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Type Definitions ---

// Extended proxy shape to include optional $removeConfigurationOption for `update(key, undefined)`
interface MainThreadConfigurationProxyShape
	extends VscodeMainThreadConfigurationShape {
	$removeConfigurationOption?(
		target: ConfigurationTargetDto | null | undefined,
		key: string,
		overrides: IConfigurationOverridesDto | null,
		scopeToLanguage?: boolean | undefined, // VS Code protocol doesn't use this for this call
	): Promise<void>;
}

// Payload for direct IPC config change events
interface IpcConfigurationChangedPayload {
	data: RpcConfigurationInitData; // Contains `effective` for new snapshot and `configurationScopes`
	change: IConfigurationChange; // Contains `keys` and `overrides`
}

type VscodeConfigurationScope =
	| VscodeApiUri
	| { uri?: VscodeApiUri; languageId?: string }
	| null
	| undefined;

/**
 * Cocoon's implementation of `IExtHostConfiguration`.
 */
export class ShimExtHostConfiguration
	extends BaseCocoonShim
	implements VscodeExtHostConfigurationShape
{
	public readonly _serviceBrand: undefined;

	#mainThreadConfigurationProxy: MainThreadConfigurationProxyShape | null =
		null;
	#currentConfigurationState: any = {}; // Cache of effective configuration values
	readonly #onDidChangeConfigurationEmitter = new EventEmitter(); // For public vscode.workspace.onDidChangeConfiguration
	#configurationKeyScopes: Map<string, ConfigurationScope | undefined> =
		new Map(); // Map<configKey, ConfigurationScope> from initData

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		initialConfigDataFromMainInit: RpcConfigurationInitData | undefined, // From main ExtHostInitData
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
			if (!this.#mainThreadConfigurationProxy) {
				this._logError(
					"Failed to obtain MainThreadConfiguration RPC proxy. Configuration features will be impaired.",
				);
			}
			// RPC self-registration (`this._rpcService.set(ExtHostContext.ExtHostConfiguration...`)
			// is handled in Cocoon's main index.ts as per the update.
		} else {
			this._logError(
				"RPCService Adapter unavailable. Cannot proxy to MainThreadConfiguration.",
			);
		}

		// Subscribe to direct IPC configuration change events
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
					// Use the $initializeConfiguration logic to update state from this payload type
					// as it also contains the full 'effective' state.
					this.$initializeConfiguration(payload.data);
					// Then fire the change event with the specific delta.
					this._fireChangeEvent(payload.change);
				},
			),
		);
		this._logInfo(
			"Subscribed to direct IPC configuration change events ('onConfigurationChanged').",
		);
	}

	// Common event firing logic, used by both RPC and direct IPC update paths.
	private _fireChangeEvent(changeDetails: IConfigurationChange): void {
		const affectedKeysForEvent = new Set<string>(changeDetails.keys);
		changeDetails.overrides?.forEach(([, /*_identifier*/ overrideKeys]) => {
			// _identifier (resource/language) is not directly used by VS Code's event.affectsConfiguration logic pattern.
			overrideKeys.forEach((key) => affectedKeysForEvent.add(key));
		});

		const eventArg: VscodeConfigurationChangeEvent = {
			affectsConfiguration: (
				section: string,
				scope?: VscodeApiUri, // Changed from VscodeUri to VscodeApiUri
			): boolean => {
				if (scope) {
					this._logWarnOnce(
						`ConfigurationChangeEvent.affectsConfiguration called with a scope for section '${section}'. ` +
							`Scope-aware checking in this shim is basic and might not be fully precise for override changes. Scope: ${scope.toString()}`,
					);
				}
				if (!section) return true; // An empty section implies global change.
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
		this._logInfo(
			`Fired public onDidChangeConfiguration event. Changed keys summary: [${changeDetails.keys.join(", ").substring(0, 100)}...]`,
		);
	}

	// --- VscodeExtHostConfigurationShape Methods (called by MainThread via RPC) ---
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
			this.#configurationKeyScopes.clear(); // If no scopes provided, clear existing ones.
			this._logWarn(
				"No configurationScopes received in $initializeConfiguration. Scopes map cleared.",
			);
		}
		// VS Code's extHostConfiguration only fires if it's not the first initialization.
		// For simplicity here, we assume $initializeConfiguration itself doesn't trigger a _fireChangeEvent,
		// as subsequent changes should come via $acceptConfigurationChanged or IPC.
		this._logInfo(
			"Full configuration cache (re)initialized via $initializeConfiguration RPC from Mountain.",
		);
	}

	public $acceptConfigurationChanged(
		data: RpcConfigurationInitData, // Contains new `effective` and `configurationScopes`
		change: IConfigurationChange, // Contains `keys` and `overrides` (delta info)
	): void {
		const changedKeysSummary = change.keys.join(", ");
		this._logInfo(
			`RPC $acceptConfigurationChanged received. Changed keys: [${changedKeysSummary.substring(0, 100)}...], Overrides: ${change.overrides?.length ?? 0}`,
		);
		this.#currentConfigurationState = deepClone(data.effective || {});
		if (data.configurationScopes) {
			this.#configurationKeyScopes = new Map(data.configurationScopes);
		}
		this._fireChangeEvent(change);
	}

	// --- vscode.workspace.getConfiguration API Implementation ---
	public async getConfiguration(
		section?: string,
		scope?: VscodeConfigurationScope, // Uses VscodeApiUri
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
				true /* isProxyUnavailable */,
			);
		}

		let configValuesFromMain: any = {};
		try {
			const resourceDto = resourceFromScope
				? (this._convertApiArgToInternal(
						// BaseCocoonShim helper
						resourceFromScope,
					) as VSCodeInternalUriComponents) // Cast to DTO URI type
				: undefined;
			const overridesDto: IConfigurationOverridesDto = {
				resource: resourceDto,
				overrideIdentifier: languageIdFromScope, // Use overrideIdentifier for languageId
			};
			// VS Code's $getConfiguration args: [section: string | null, overrides: IConfigurationOverridesDto | null, extensionId: ExtensionIdentifier | undefined]
			// The third argument `extensionId` is for when MainThread needs to know which extension is asking.
			// For general `vscode.workspace.getConfiguration`, this is usually `undefined`.
			configValuesFromMain =
				await this.#mainThreadConfigurationProxy.$getConfiguration([
					section || null,
					overridesDto,
					undefined, // extensionId, if needed by specific MainThread logic
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
			configValuesFromMain = cachedSectionValues || {}; // Use cache on RPC error
		}
		return this._createShimVscodeWorkspaceConfiguration(
			configValuesFromMain || {},
			section || "",
			scope,
			extensionIdForValidationLog,
		);
	}

	private _getSectionFromCache(fullConfig: any, section?: string): any {
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
		originalScope?: VscodeConfigurationScope, // Uses VscodeApiUri
		extensionIdForValidationLog?: ExtensionIdentifier,
		isProxyUnavailable = false,
	): VscodeWorkspaceConfiguration {
		const self = this;
		const lookupValue = <T>(key: string): T | undefined => {
			const fullKey = sectionPrefix ? `${sectionPrefix}.${key}` : key;
			this._validateConfigurationAccess(
				fullKey,
				originalScope,
				extensionIdForValidationLog,
			);
			let current = configSnapshotValues;
			if (!key && sectionPrefix) {
				// Requesting the root of a prefixed section
				return typeof current === "object" && current !== null
					? deepClone(current)
					: current;
			}
			if (key) {
				// If key is not empty, traverse into the snapshot
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
			}
			return typeof current === "object" && current !== null
				? deepClone(current)
				: current;
		};

		const workspaceConfigShim: VscodeWorkspaceConfiguration = {
			get: <T>(key: string, defaultValue?: T): T | undefined => {
				const value = lookupValue<T>(key);
				return value !== undefined ? value : defaultValue;
			},
			has: (key: string): boolean => lookupValue<any>(key) !== undefined,
			inspect: async <T>(
				key: string,
			): Promise<
				// Matches vscode.d.ts inspect return type
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
					// VS Code's $inspectConfiguration args: [resourceComponents: UriComponents | null, languageId: string | null, key: string]
					const inspectInfo =
						await self.#mainThreadConfigurationProxy.$inspectConfiguration(
							resourceDto ?? null,
							languageIdFromScope ?? null,
							fullKeyToInspect,
						);
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
					| VscodeConfigurationScope, // Uses VscodeApiUri
				overrideInLanguageOrScope?: boolean | VscodeConfigurationScope, // Uses VscodeApiUri
			): Promise<void> => {
				if (isProxyUnavailable || !self.#mainThreadConfigurationProxy) {
					const msg = `Cannot update config key='${key}': RPC proxy unavailable.`;
					self._logError(msg);
					throw new Error(msg);
				}
				const fullKeyToUpdate = sectionPrefix
					? `${sectionPrefix}.${key}`
					: key;
				let targetDto: ConfigurationTargetDto | null | undefined = null;
				let overridesDto: IConfigurationOverridesDto | null = null;

				// --- Argument Parsing Logic for `update` Overloads (align with VS Code ExtHostConfiguration) ---
				let targetArg: ConfigurationTargetDto | undefined;
				let resourceArg: VscodeApiUri | undefined;
				let languageIdArg: string | undefined;

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
									: undefined;
					if (typeof overrideInLanguageOrScope === "boolean") {
						// scopeToLanguage (deprecated usage)
						if (overrideInLanguageOrScope === true) {
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
						// VscodeConfigurationScope
						resourceArg =
							overrideInLanguageOrScope instanceof VscodeApiUri
								? overrideInLanguageOrScope
								: overrideInLanguageOrScope.uri;
						languageIdArg = overrideInLanguageOrScope.languageId;
					}
				} else if (typeof configurationTargetOrScope === "boolean") {
					// globalOrWorkspace (deprecated)
					targetArg = configurationTargetOrScope
						? ConfigurationTargetDto.UserLocal
						: ConfigurationTargetDto.Workspace;
					if (
						typeof overrideInLanguageOrScope === "boolean" &&
						overrideInLanguageOrScope === true
					) {
						// scopeToLanguage
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
					// VscodeConfigurationScope (target is implicit)
					resourceArg =
						configurationTargetOrScope instanceof VscodeApiUri
							? configurationTargetOrScope
							: configurationTargetOrScope.uri;
					languageIdArg = configurationTargetOrScope.languageId;
				} else {
					// No target or scope arg -> use original scope of the WorkspaceConfiguration object
					resourceArg =
						originalScope instanceof VscodeApiUri
							? originalScope
							: typeof originalScope === "object" &&
								originalScope?.uri;
					languageIdArg =
						typeof originalScope === "object" &&
						originalScope?.languageId;
				}

				targetDto = targetArg;
				overridesDto = {
					resource: resourceArg
						? (self._convertApiArgToInternal(
								resourceArg,
							) as VSCodeInternalUriComponents)
						: undefined,
					overrideIdentifier: languageIdArg, // VS Code protocol uses overrideIdentifier for languageId
				};

				const valueForRpc = value === undefined ? null : value; // `null` signifies deletion to MainThread
				const rpcCallPromise =
					valueForRpc === null &&
					self.#mainThreadConfigurationProxy!
						.$removeConfigurationOption
						? self.#mainThreadConfigurationProxy!.$removeConfigurationOption(
								targetDto,
								fullKeyToUpdate,
								overridesDto,
								undefined /* scopeToLanguage not used here in VS Code protocol */,
							)
						: self.#mainThreadConfigurationProxy!.$updateConfigurationOption(
								[
									targetDto,
									fullKeyToUpdate,
									valueForRpc,
									overridesDto,
									undefined /* scopeToLanguage not used here */,
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
					throw error; // Rethrow to signal failure
				}
			},
		};

		return new Proxy(workspaceConfigShim, {
			get(target, prop: string | symbol, receiver) {
				if (
					prop in target ||
					typeof prop === "symbol" ||
					prop === "then" || // Handle thenable for async operations on proxy
					typeof (target as any)[prop] === "function"
				) {
					return Reflect.get(target, prop, receiver);
				}
				// For direct property access, treat as a 'get' call
				if (typeof prop === "string") return target.get(prop);
				return Reflect.get(target, prop, receiver);
			},
			has(target, prop: string | symbol) {
				if (prop in target || typeof prop === "symbol")
					return Reflect.has(target, prop);
				// For direct property 'has' check, treat as a 'has' call
				if (typeof prop === "string") return target.has(prop);
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
				// Check for URI DTOs (needs to align with how BaseCocoonShim._reviveApiArgument identifies URIs)
				if (
					value &&
					typeof value === "object" &&
					(value.$mid === MarshalledId.UriSimple || // Old marshalling ID
						value.$mid === MarshalledId.Uri || // VS Code internal marshalling ID
						(typeof value.scheme === "string" && // Heuristic for UriComponents
							typeof value.path === "string"))
				) {
					result[key] = this._reviveApiArgument(value); // Use base shim's reviver
				} else if (
					Array.isArray(value) &&
					key === "overrideIdentifiers" && // From IConfigurationInspectColors -> IConfigurationInspect<T>
					value.every((item) => typeof item === "string")
				) {
					// `overrideIdentifiers` are language IDs (strings), no revival needed.
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
		scope?: VscodeConfigurationScope | null, // Uses VscodeApiUri
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
		// Add checks for other scopes like MACHINE, MACHINE_OVERRIDABLE if needed.
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
					| VscodeConfigurationScope // Uses VscodeApiUri
					| ExtensionIdentifier,
				_actualExtensionIdIfSecondWasScope?: ExtensionIdentifier,
			): Promise<VscodeWorkspaceConfiguration> => {
				let actualScope: VscodeConfigurationScope | undefined =
					undefined;
				let extensionIdForValidationLog:
					| ExtensionIdentifier
					| undefined = _actualExtensionIdIfSecondWasScope;
				if (scopeOrExtensionId instanceof ExtensionIdentifier) {
					extensionIdForValidationLog = scopeOrExtensionId;
				} else {
					// Type assertion needed if VscodeConfigurationScope is not directly assignable
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
