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
 *
 * Last Reviewed/Updated: [Date of Merge or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter } from "events"; // Node.js EventEmitter
import { type Event as VscodeEvent } from "vs/base/common/event";
import { MarshalledId } from "vs/base/common/marshalling";
import { deepClone } from "vs/base/common/objects";
import { ConfigurationScope } from "vs/platform/configuration/common/configurationRegistry";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions";
import {
	ConfigurationTargetDto,
	ExtHostContext, // For RPC self-registration
	MainContext,
	type IConfigurationChange,
	type IConfigurationOverridesDto,
	type IConfigurationInitData as RpcConfigurationInitData,
	type ExtHostConfigurationShape as VscodeExtHostConfigurationShape,
	type UriComponents as VSCodeInternalUriComponents,
	type MainThreadConfigurationShape as VscodeMainThreadConfigurationShape,
} from "vs/workbench/api/common/extHost.protocol";

import * as ipc from "../cocoon-ipc"; // For direct IPC subscription
import {
	Uri as VscodeApiUri,
	ConfigurationTarget as VscodeConfigurationTarget,
	type ConfigurationChangeEvent as VscodeConfigurationChangeEvent,
	type WorkspaceConfiguration as VscodeWorkspaceConfiguration,
} from "../Shim/out/vscode";
// Public API types

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Type Definitions ---

interface MainThreadConfigurationProxyShape
	extends VscodeMainThreadConfigurationShape {
	$removeConfigurationOption?(
		target: ConfigurationTargetDto | null | undefined,
		key: string,
		overrides: IConfigurationOverridesDto | null,
		scopeToLanguage?: boolean | undefined,
	): Promise<void>;
}

interface IpcConfigurationChangedPayload {
	data: RpcConfigurationInitData;
	change: IConfigurationChange;
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
	#currentConfigurationState: any = {};
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
			// Register self for RPC calls from MainThreadConfiguration
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
					this.$initializeConfiguration(payload.data); // Use $initialize to update full state
					this._fireChangeEvent(payload.change); // Then fire specific change
				},
			),
		);
		this._logInfo(
			"Subscribed to direct IPC configuration change events ('onConfigurationChanged').",
		);
	}

	private _fireChangeEvent(changeDetails: IConfigurationChange): void {
		const affectedKeysForEvent = new Set<string>(changeDetails.keys);
		changeDetails.overrides?.forEach((overrideTuple) => {
			// The override tuple structure from VS Code is typically [identifier: string, keys: string[]]
			// where identifier might be a language ID or a resource URI string.
			// For `affectsConfiguration` logic, we care about the keys.
			const overrideKeys =
				Array.isArray(overrideTuple) &&
				overrideTuple.length === 2 &&
				Array.isArray(overrideTuple[1])
					? overrideTuple[1]
					: []; // Fallback if structure is unexpected

			overrideKeys.forEach((key) => affectedKeysForEvent.add(key));
		});

		const eventArg: VscodeConfigurationChangeEvent = {
			affectsConfiguration: (
				section: string,
				scope?: VscodeApiUri,
			): boolean => {
				if (scope) {
					this._logWarnOnce(
						`ConfigurationChangeEvent.affectsConfiguration called with a scope for section '${section}'. Scope-aware checking is basic. Scope: ${scope.toString()}`,
					);
				}
				if (!section) return true;
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
			`Fired public onDidChangeConfiguration event. Changed keys summary: [${Array.from(affectedKeysForEvent).join(", ").substring(0, 100)}...]`,
		);
	}

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
		this._logInfo(
			"Full configuration cache (re)initialized via $initializeConfiguration RPC from Mountain.",
		);
	}

	public $acceptConfigurationChanged(
		data: RpcConfigurationInitData,
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
		this._fireChangeEvent(change);
	}

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
					) as VSCodeInternalUriComponents)
				: undefined;
			const overridesDto: IConfigurationOverridesDto = {
				resource: resourceDto,
				overrideIdentifier: languageIdFromScope,
			};
			// VS Code's $getConfiguration args tuple: [section: string | null, overrides: IConfigurationOverridesDto | null, extensionId: ExtensionIdentifier | undefined]
			// We pass extensionId as undefined for general workspace.getConfiguration.
			// Note: The protocol expects an array (tuple) as a single argument.
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
			configValuesFromMain = cachedSectionValues || {};
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
				return typeof current === "object" && current !== null
					? deepClone(current)
					: current;
			}
			if (key) {
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

				let targetArg: ConfigurationTargetDto | undefined;
				let resourceArg: VscodeApiUri | undefined;
				let languageIdArg: string | undefined;
				let scopeToLanguageArg: boolean | undefined = undefined; // VS Code internal

				if (typeof configurationTargetOrScope === "number") {
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
						scopeToLanguageArg = overrideInLanguageOrScope;
						if (overrideInLanguageOrScope === true) {
							// implies language scope with original resource
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
						resourceArg =
							overrideInLanguageOrScope instanceof VscodeApiUri
								? overrideInLanguageOrScope
								: overrideInLanguageOrScope.uri;
						languageIdArg = overrideInLanguageOrScope.languageId;
					}
				} else if (typeof configurationTargetOrScope === "boolean") {
					targetArg = configurationTargetOrScope
						? ConfigurationTargetDto.UserLocal
						: ConfigurationTargetDto.Workspace;
					if (
						typeof overrideInLanguageOrScope === "boolean" &&
						overrideInLanguageOrScope === true
					) {
						scopeToLanguageArg = overrideInLanguageOrScope;
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
					resourceArg =
						configurationTargetOrScope instanceof VscodeApiUri
							? configurationTargetOrScope
							: configurationTargetOrScope.uri;
					languageIdArg = configurationTargetOrScope.languageId;
					if (typeof overrideInLanguageOrScope === "boolean") {
						scopeToLanguageArg = overrideInLanguageOrScope;
					}
				} else {
					resourceArg =
						originalScope instanceof VscodeApiUri
							? originalScope
							: typeof originalScope === "object" &&
								originalScope?.uri;
					languageIdArg =
						typeof originalScope === "object" &&
						originalScope?.languageId;
					if (typeof overrideInLanguageOrScope === "boolean") {
						scopeToLanguageArg = overrideInLanguageOrScope;
					}
				}

				targetDto = targetArg;
				overridesDto = {
					resource: resourceArg
						? (self._convertApiArgToInternal(
								resourceArg,
							) as VSCodeInternalUriComponents)
						: undefined,
					overrideIdentifier: languageIdArg,
				};

				const valueForRpc = value === undefined ? null : value;
				const rpcCallPromise =
					valueForRpc === null &&
					self.#mainThreadConfigurationProxy!
						.$removeConfigurationOption
						? self.#mainThreadConfigurationProxy!.$removeConfigurationOption(
								targetDto,
								fullKeyToUpdate,
								overridesDto,
								scopeToLanguageArg,
							)
						: self.#mainThreadConfigurationProxy!.$updateConfigurationOption(
								// VS Code protocol for $updateConfigurationOption expects a tuple argument
								[
									targetDto,
									fullKeyToUpdate,
									valueForRpc,
									overridesDto,
									scopeToLanguageArg,
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
					throw error;
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
				if (
					value &&
					typeof value === "object" &&
					(value.$mid === MarshalledId.UriSimple ||
						value.$mid === MarshalledId.Uri ||
						(typeof value.scheme === "string" &&
							typeof value.path === "string"))
				) {
					result[key] = this._reviveApiArgument(value);
				} else if (
					Array.isArray(value) &&
					key === "overrideIdentifiers" &&
					value.every((item) => typeof item === "string")
				) {
					result[key] = value;
				} else if (typeof value === "object" && value !== null) {
					result[key] = this._reviveInspectResult(value);
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
