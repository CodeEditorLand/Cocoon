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
 * or, potentially, via direct IPC events (`ipc.onConfigurationChanged`).
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
 * - Can receive configuration updates via direct IPC (`ipc.onConfigurationChanged`).
 *   (Note: Using both RPC and direct IPC for updates should be managed carefully to avoid conflicts).
 * - Uses `BaseCocoonShim` for common utilities.
 * - TODO: Consider adopting VS Code's internal `Configuration` model class for more robust
 *   handling of configuration data and `IConfigurationOverrides`.
 * - TODO: Centralize `vscode.ConfigurationScope` to `IConfigurationOverridesDto` conversion.
 *
 *--------------------------------------------------------------------------------------------*/

// Node.js EventEmitter
import { EventEmitter } from "events";
import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
import { MarshalledId } from "vs/base/common/marshalling"; // For URI DTO $mid checks
import { deepClone } from "vs/base/common/objects"; // For deep cloning config values for `get`

import {
	ConfigurationScope, // For validating access
	OVERRIDE_PROPERTY_REGEX, // For validating access
} from "vs/platform/configuration/common/configurationRegistry";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions";
import {
	ConfigurationTargetDto,
	ExtHostContext,
	MainContext,
	type IConfigurationChange,
	type IConfigurationInitData,
	type IConfigurationOverridesDto,
	type ExtHostConfigurationShape as VscodeExtHostConfigurationShape,
	type MainThreadConfigurationShape as VscodeMainThreadConfigurationShape, // For MainThread proxy type
} from "vs/workbench/api/common/extHost.protocol";

// For direct IPC subscription
import * as ipc from "../cocoon-ipc";
import {
	// Public API enum
	ConfigurationTarget as VscodeConfigurationTarget,
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

// Extended proxy shape to include optional $removeConfigurationOption for `update(key, undefined)`
interface MainThreadConfigurationProxyShape
	extends VscodeMainThreadConfigurationShape {
	$removeConfigurationOption?(
		target: ConfigurationTargetDto | null | undefined,
		key: string,
		overrides: IConfigurationOverridesDto | null,
		scopeToLanguage: boolean | undefined,
	): Promise<void>;
}

// Payload for direct IPC config change events (matches parameters of $acceptConfigurationChanged RPC)
// Renaming from MountainConfigNotificationPayload for clarity.
interface IpcConfigurationChangedPayload {
	data: IConfigurationInitData; // Contains `effective` for new snapshot and `configurationScopes`
	change: IConfigurationChange; // Contains `keys` and `overrides`
}

type VscodeConfigurationScope =
	| VscodeUri
	| { uri?: VscodeUri; languageId?: string }
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
		// Expects IConfigurationInitData for initial setup.
		// Typically from revivedInitData.configurationData or revivedInitData itself if it matches IConfigurationInitData.
		initialConfigData: IConfigurationInitData | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostConfiguration", rpcService, logService);
		this._logInfo("Initializing...");

		if (initialConfigData?.effective) {
			this.#currentConfigurationState = deepClone(
				initialConfigData.effective,
			);
			this._logInfo(
				"Initial configuration cache populated from initialConfigData.effective.",
			);
		} else {
			this._logWarn(
				"No initial configuration data (initialConfigData.effective) provided. Cache starts empty.",
			);
		}
		if (initialConfigData?.configurationScopes) {
			this.#configurationKeyScopes = new Map(
				initialConfigData.configurationScopes,
			);
			this._logDebug(
				`Initialized with ${this.#configurationKeyScopes.size} configuration scope definitions.`,
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
							"IPC $acceptConfigurationChanged: Invalid payload.data.effective.",
							payload,
						);
						return;
					}
					this.#currentConfigurationState = deepClone(
						payload.data.effective,
					);
					if (payload.data.configurationScopes) {
						this.#configurationKeyScopes = new Map(
							payload.data.configurationScopes,
						);
					}
					this._fireChangeEvent(payload.change); // Use common event firing logic
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
			// _identifier is not used by VS Code's event affectsConfiguration
			overrideKeys.forEach((key) => affectedKeysForEvent.add(key));
		});

		const eventArg: VscodeConfigurationChangeEvent = {
			affectsConfiguration: (
				section: string,
				scope?: VscodeUri,
			): boolean => {
				// TODO: A more robust affectsConfiguration check would consider the specific `scope` URI
				// against the `changeDetails.overrides` which include identifiers.
				// This requires `changeDetails.overrides` to be structured with `[string, string[]]` where
				// the first string is the resource/language identifier.
				// For MVP, this simplified check looks at all changed keys.
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
	public $initializeConfiguration(data: IConfigurationInitData): void {
		this._logInfo(
			`RPC $initializeConfiguration received. Effective keys: ${Object.keys(data.effective || {}).length}`,
		);
		this.#currentConfigurationState = deepClone(data.effective || {});
		if (data.configurationScopes) {
			this.#configurationKeyScopes = new Map(data.configurationScopes);
		}
		this._logInfo(
			"Configuration cache (re)initialized via $initializeConfiguration RPC.",
		);
		// Note: This initial load typically shouldn't fire onDidChangeConfiguration unless it's a re-initialization.
		// VS Code's extHostConfiguration only fires if it's not the first initialization.
	}

	public $acceptConfigurationChanged(
		data: IConfigurationInitData,
		change: IConfigurationChange,
	): void {
		const changedKeysSummary = change.keys.join(", ");
		this._logInfo(
			`RPC $acceptConfigurationChanged received. Changed keys: [${changedKeysSummary.substring(0, 100)}...], Overrides: ${change.overrides?.length ?? 0}`,
		);
		this.#currentConfigurationState = deepClone(data.effective || {});
		if (data.configurationScopes) {
			this.#configurationKeyScopes = new Map(data.configurationScopes);
		}
		this._fireChangeEvent(change); // Use common event firing logic
	}

	// --- vscode.workspace.getConfiguration API Implementation ---
	public async getConfiguration(
		section?: string,
		scope?: VscodeConfigurationScope,
		extensionIdForValidationLog?: ExtensionIdentifier, // Added for validation logging
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
						resourceFromScope,
					) as IConfigurationOverridesDto["resource"])
				: undefined;
			const overridesDto: IConfigurationOverridesDto = {
				resource: resourceDto,
				languageId: languageIdFromScope,
			};
			// VS Code's $getConfiguration args: [section: string | null, overrides: IConfigurationOverrides | null, extensionId: ExtensionIdentifier | undefined]
			// The third arg `scopeToLanguage` was a misinterpretation of VS Code's protocol from the original shim.
			// Instead, it's `extensionId` if the configuration is being fetched on behalf of a specific extension (rarely used by this API directly).
			// For now, passing undefined for the third arg.
			configValuesFromMain =
				await this.#mainThreadConfigurationProxy.$getConfiguration([
					section || null,
					overridesDto,
					undefined /* extensionId if needed */,
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
		originalScope?: VscodeConfigurationScope,
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
			inspect: async <T>(key: string): Promise<any | undefined> => {
				// Return type matches vscode.d.ts
				if (
					isProxyUnavailable ||
					!self.#mainThreadConfigurationProxy?.$inspectConfiguration
				) {
					// VS Code uses $inspectConfiguration
					self._logError(
						"Cannot inspect configuration: RPC proxy or $inspectConfiguration method unavailable.",
					);
					return undefined;
				}
				const fullKeyToInspect = sectionPrefix
					? `${sectionPrefix}.${key}`
					: key;
				const resourceFromScope =
					originalScope instanceof VscodeUri
						? originalScope
						: typeof originalScope === "object" &&
							  originalScope?.uri instanceof VscodeUri
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
						error,
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
				let targetDto: ConfigurationTargetDto | null | undefined = null;
				let overridesDto: IConfigurationOverridesDto | null = null;
				let scopeToLangDto: boolean | undefined = undefined; // This was a misinterpretation, VS Code's protocol doesn't use this directly in $updateConfigurationOption for this purpose.

				// --- Refined Argument Parsing Logic for `update` Overloads (align with VS Code ExtHostConfiguration) ---
				let target: ConfigurationTargetDto | undefined;
				let resource: VscodeUri | undefined;
				let languageId: string | undefined;

				if (typeof configurationTargetOrScope === "number") {
					// VscodeConfigurationTarget
					target =
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
						// scopeToLanguage (deprecated usage pattern)
						if (overrideInLanguageOrScope === true) {
							resource =
								originalScope instanceof VscodeUri
									? originalScope
									: typeof originalScope === "object" &&
										originalScope?.uri;
							languageId =
								typeof originalScope === "object" &&
								originalScope?.languageId;
							if (!languageId && resource) {
								/* Should not happen if scopeToLanguage=true */
							}
						}
					} else if (overrideInLanguageOrScope) {
						// VscodeConfigurationScope
						resource =
							overrideInLanguageOrScope instanceof VscodeUri
								? overrideInLanguageOrScope
								: overrideInLanguageOrScope.uri;
						languageId = overrideInLanguageOrScope.languageId;
					}
				} else if (typeof configurationTargetOrScope === "boolean") {
					// globalOrWorkspace (deprecated)
					target = configurationTargetOrScope
						? ConfigurationTargetDto.UserLocal
						: ConfigurationTargetDto.Workspace;
					if (
						typeof overrideInLanguageOrScope === "boolean" &&
						overrideInLanguageOrScope === true
					) {
						// scopeToLanguage
						resource =
							originalScope instanceof VscodeUri
								? originalScope
								: typeof originalScope === "object" &&
									originalScope?.uri;
						languageId =
							typeof originalScope === "object" &&
							originalScope?.languageId;
					}
				} else if (configurationTargetOrScope) {
					// VscodeConfigurationScope (target is implicit based on scope)
					resource =
						configurationTargetOrScope instanceof VscodeUri
							? configurationTargetOrScope
							: configurationTargetOrScope.uri;
					languageId = configurationTargetOrScope.languageId;
					// Target is inferred by MainThread based on presence of resource/languageId
				} else {
					// No target or scope arg -> use original scope of the WorkspaceConfiguration object
					resource =
						originalScope instanceof VscodeUri
							? originalScope
							: typeof originalScope === "object" &&
								originalScope?.uri;
					languageId =
						typeof originalScope === "object" &&
						originalScope?.languageId;
				}

				targetDto = target;
				overridesDto = {
					resource: resource
						? (self._convertApiArgToInternal(
								resource,
							) as VSCodeInternalUriComponents)
						: undefined,
					overrideIdentifier: languageId, // VS Code protocol uses overrideIdentifier for languageId
				};
				// `scopeToLanguageDto` not used as per VS Code's $updateConfigurationOption structure,
				// language-specific updates are handled by `overrideIdentifier` in `overridesDto`.

				const valueForRpc = value === undefined ? null : value; // null for deletion
				const rpcCallPromise =
					valueForRpc === null &&
					self.#mainThreadConfigurationProxy!
						.$removeConfigurationOption
						? self.#mainThreadConfigurationProxy!.$removeConfigurationOption(
								targetDto,
								fullKeyToUpdate,
								overridesDto,
								undefined /* scopeToLanguage not used */,
							)
						: self.#mainThreadConfigurationProxy!.$updateConfigurationOption(
								[
									targetDto,
									fullKeyToUpdate,
									valueForRpc,
									overridesDto,
									undefined /* scopeToLanguage not used */,
								],
							);
				try {
					await rpcCallPromise;
				} catch (error: any) {
					self._logError(
						`Config.update RPC for key='${fullKeyToUpdate}' failed:`,
						error,
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
					prop === "then" ||
					typeof (target as any)[prop] === "function"
				) {
					return Reflect.get(target, prop, receiver);
				}
				if (typeof prop === "string") return target.get(prop);
				return Reflect.get(target, prop, receiver);
			},
			has(target, prop: string | symbol) {
				if (prop in target || typeof prop === "symbol")
					return Reflect.has(target, prop);
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
				// Broader check for URI DTOs, not just $mid based.
				if (
					value &&
					typeof value === "object" &&
					(value.$mid === MarshalledId.UriSimple ||
						value.$mid === MarshalledId.Uri ||
						(typeof value.scheme === "string" &&
							value.path !== undefined))
				) {
					result[key] = this._reviveApiArgument(value); // Use base shim's reviver
				} else if (
					Array.isArray(value) &&
					key === "overrideIdentifiers" &&
					value.every((item) => typeof item === "string")
				) {
					// For `overrideIdentifiers` in `IConfigurationInspect<T>`, which are language IDs (strings), not URIs.
					// No revival needed for string array.
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
			if (scope instanceof VscodeUri) {
				resourceDefined = true;
			} else if (
				scope &&
				typeof scope === "object" &&
				scope.uri instanceof VscodeUri
			) {
				resourceDefined = true;
			}
			if (!resourceDefined) {
				this._logWarnOnce(
					`${extensionIdText}Accessing resource-scoped config '${key}' without a resource URI. Effective value might be unexpected. Provide a resource URI or 'null' in scope.`,
				);
			}
		} else if (configScopeMeta === ConfigurationScope.WINDOW) {
			let resourceDefined = false;
			if (scope instanceof VscodeUri) {
				resourceDefined = true;
			} else if (
				scope &&
				typeof scope === "object" &&
				scope.uri instanceof VscodeUri
			) {
				resourceDefined = true;
			}
			if (resourceDefined) {
				this._logWarnOnce(
					`${extensionIdText}Accessing window-scoped config '${key}' with a resource URI scope. Resource URI will be ignored for window-scoped settings.`,
				);
			}
		}
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
					extensionIdForValidationLog = scopeOrExtensionId;
				} else {
					actualScope = scopeOrExtensionId;
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
