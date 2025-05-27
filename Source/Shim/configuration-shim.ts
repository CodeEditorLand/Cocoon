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
 * - Uses `BaseCocoonShim` for common utilities.
 *
 *--------------------------------------------------------------------------------------------*/

// Node.js EventEmitter
import { EventEmitter } from "events";
import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
// For deep cloning config values for `get`
import { deepClone } from "vs/base/common/objects";
import {
	// For validating access
	ConfigurationScope,
	// For validating access
	OVERRIDE_PROPERTY_REGEX,
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

interface MainThreadConfigurationProxyShape {
	$getConfiguration(
		args: [
			string | null,

			IConfigurationOverridesDto | null,

			boolean | undefined,
		],
	): Promise<any>;

	$inspect(args: [string[]]): Promise<{ [key: string]: any }>;

	$updateConfigurationOption(
		args: [
			ConfigurationTargetDto | null | undefined,

			string,

			any,

			IConfigurationOverridesDto | null,

			boolean | undefined,
		],
	): Promise<void>;

	// Added for `update(key, undefined)` to signal deletion
	$removeConfigurationOption?(
		target: ConfigurationTargetDto | null | undefined,

		key: string,

		overrides: IConfigurationOverridesDto | null,

		scopeToLanguage: boolean | undefined,
	): Promise<void>;
}

interface MountainConfigNotificationPayload {
	values: any;
}

interface MountainConfigChangeDetails {
	keys: string[];

	overrides: [string, string[]][];
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

	#currentConfigurationState: any = {};

	// Node.js EventEmitter
	readonly #onDidChangeConfigurationEmitter = new EventEmitter();

	// Map<configKey, ConfigurationScope> from initData
	#configurationKeyScopes: Map<string, ConfigurationScope | undefined> =
		new Map();

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		configurationInitData: IConfigurationInitData | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostConfiguration", rpcService, logService);

		this._logInfo("Initializing...");

		if (configurationInitData?.effective) {
			this.#currentConfigurationState = deepClone(
				configurationInitData.effective,
			);

			this._logInfo(
				"Initial configuration cache populated from initData.effective.",
			);
		} else {
			this._logWarn(
				"No initial configuration data (initData.effective) provided. Cache starts empty.",
			);
		}

		if (configurationInitData?.configurationScopes) {
			this.#configurationKeyScopes = new Map(
				configurationInitData.configurationScopes,
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
		// TODO: Reconcile IPC vs RPC update channel priority
		this._instanceDisposables.add(
			ipc.onConfigurationChanged(
				([newConfigPayload, changeDetails]: [
					MountainConfigNotificationPayload | null,

					MountainConfigChangeDetails | undefined,
				]) => {
					this._logDebug("Direct IPC configuration update received.");

					if (
						!newConfigPayload ||
						typeof newConfigPayload.values !== "object"
					) {
						this._logError(
							"IPC $acceptConfigurationChanged: Invalid newConfigPayload.values.",

							newConfigPayload,
						);

						return;
					}

					this.#currentConfigurationState = deepClone(
						newConfigPayload.values,
					);

					this._fireChangeEventFromIPC(changeDetails);
				},
			),
		);

		this._logInfo(
			"Subscribed to direct IPC configuration change events ('onConfigurationChanged').",
		);
	}

	private _fireChangeEventFromIPC(
		changeDetails: MountainConfigChangeDetails | undefined,
	): void {
		const affectedKeysForEvent = new Set<string>(changeDetails?.keys || []);

		changeDetails?.overrides?.forEach(([_identifier, overrideKeys]) => {
			overrideKeys.forEach((key) => affectedKeysForEvent.add(key));
		});

		const eventArg: VscodeConfigurationChangeEvent = {
			affectsConfiguration: (
				section: string,

				scope?: VscodeUri,
			): boolean => {
				if (scope) {
					this._logWarnOnce(
						`IPC ChangeEvent.affectsConfiguration with scope check for '${section}'. Scope: ${scope.toString()}. This might be less precise if detailed override info via IPC is limited.`,
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
			"Fired public onDidChangeConfiguration event due to direct IPC update.",
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
	}

	public $acceptConfigurationChanged(
		data: IConfigurationInitData,

		change: IConfigurationChange,
	): void {
		const changedKeysSummary = change.keys.join(", ");

		this._logInfo(
			`RPC $acceptConfigurationChanged received. Changed keys: [${changedKeysSummary}], Overrides: ${change.overrides?.length ?? 0}`,
		);

		this.#currentConfigurationState = deepClone(data.effective || {});

		if (data.configurationScopes) {
			// Also update scopes if provided
			this.#configurationKeyScopes = new Map(data.configurationScopes);
		}

		const eventArg: VscodeConfigurationChangeEvent = {
			affectsConfiguration: (
				section: string,

				scope?: VscodeUri,
			): boolean => {
				if (!section) return true;

				for (const key of change.keys) {
					if (key === section || key.startsWith(section + "."))
						return true;
				}

				if (change.overrides && scope) {
					for (const override of change.overrides) {
						const scopeIdentifier =
							// Simplified scope check
							scope.languageId || scope.toString();

						if (
							scopeIdentifier &&
							!override.identifiers.includes(scopeIdentifier)
						)
							continue;

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

		this._logInfo(
			"Fired public onDidChangeConfiguration event due to RPC update ($acceptConfigurationChanged).",
		);
	}

	// --- vscode.workspace.getConfiguration API Implementation ---
	public async getConfiguration(
		section?: string,

		// VscodeConfigurationScope is from ./_baseShim
		scope?: VscodeConfigurationScope,

		// Added for validation logging
		extensionId?: ExtensionIdentifier,
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
			`API getConfiguration: Section='${section || "(root)"}', Scope='${scopeForLog}', Extension='${extensionId?.value || "N/A"}'`,
		);

		if (!this.#mainThreadConfigurationProxy) {
			this._logError(
				"getConfiguration: MainThreadConfiguration RPC proxy unavailable. Using stale local cache.",
			);

			const cachedSectionValues = this._getSectionFromCache(
				this.#currentConfigurationState,

				section,
			);

			return this._createShimVscodeWorkspaceConfiguration(
				cachedSectionValues || {},

				section || "",

				scope,

				extensionId,

				true,
			);
		}

		let configValuesFromMain: any = {};

		try {
			// MarshalledId.UriSimple is typically used for UriComponents DTOs
			const resourceDto = resourceFromScope
				? (this._convertApiArgToInternal(
						resourceFromScope,
					) as IConfigurationOverridesDto["resource"])
				: undefined;

			const overridesDto: IConfigurationOverridesDto = {
				resource: resourceDto,

				languageId: languageIdFromScope,
			};

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

			extensionId,
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

		// For access validation logging
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

			if (!key && sectionPrefix) {
				// Requesting the root of a prefixed section
				return typeof configSnapshotValues === "object" &&
					configSnapshotValues !== null
					? deepClone(configSnapshotValues)
					: configSnapshotValues;
			}

			// If key is empty, current is the whole snapshot for this section
			let current = configSnapshotValues;

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
				if (isProxyUnavailable || !self.#mainThreadConfigurationProxy) {
					self._logError(
						"Cannot inspect configuration: RPC proxy unavailable.",
					);

					return undefined;
				}

				const fullKeyToInspect = sectionPrefix
					? `${sectionPrefix}.${key}`
					: key;

				try {
					// TODO: Revive URIs if any in inspectInfo.default.overrideIdentifier (if it can be URI) or other parts.
					const inspectResultMap =
						await self.#mainThreadConfigurationProxy.$inspect([
							[fullKeyToInspect],
						]);

					const inspectInfo = inspectResultMap
						? inspectResultMap[fullKeyToInspect]
						: undefined;

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

				let scopeToLangDto: boolean | undefined = undefined;

				// --- Refined Argument Parsing Logic for `update` Overloads ---
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
						// VscodeConfigurationScope
						finalScopeForOverrides = overrideInLanguageOrScope;
					}
				} else if (typeof configurationTargetOrScope === "boolean") {
					// globalOrWorkspace (deprecated)
					finalConfigurationTarget = configurationTargetOrScope
						? VscodeConfigurationTarget.Global
						: VscodeConfigurationTarget.Workspace;

					if (typeof overrideInLanguageOrScope === "boolean") {
						finalOverrideInLanguage = overrideInLanguageOrScope;
					}
				} else if (configurationTargetOrScope) {
					// VscodeConfigurationScope
					finalScopeForOverrides = configurationTargetOrScope;

					if (typeof overrideInLanguageOrScope === "boolean") {
						finalOverrideInLanguage = overrideInLanguageOrScope;
					}
				} else {
					// configurationTargetOrScope is undefined/null
					if (typeof overrideInLanguageOrScope === "boolean") {
						finalOverrideInLanguage = overrideInLanguageOrScope;
					} else if (overrideInLanguageOrScope) {
						finalScopeForOverrides = overrideInLanguageOrScope;
					}
				}

				// --- End Argument Parsing ---

				// --- Convert to DTOs for RPC ---
				if (
					finalConfigurationTarget ===
					VscodeConfigurationTarget.Global
				)
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

						overridesDto = {
							...(overridesDto || {}),

							resource: self._convertApiArgToInternal(
								resourceUriForFolderTarget,
							) as IConfigurationOverridesDto["resource"],
						};
					} else {
						self._logWarn(
							`Update: WorkspaceFolder target for '${fullKeyToUpdate}' needs resource URI in scope.`,
						);
					}
				}

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

				scopeToLangDto = finalOverrideInLanguage;

				if (
					finalOverrideInLanguage === undefined &&
					overridesDto?.languageId &&
					!overridesDto.resource
				) {
					scopeToLangDto = true;
				}

				// undefined means delete, send null
				const valueForRpc = value === undefined ? null : value;

				const rpcCallPromise =
					valueForRpc === null &&
					self.#mainThreadConfigurationProxy!
						.$removeConfigurationOption
						? self.#mainThreadConfigurationProxy!.$removeConfigurationOption(
								targetDto,

								fullKeyToUpdate,

								overridesDto,

								scopeToLangDto,
							)
						: self.#mainThreadConfigurationProxy!.$updateConfigurationOption(
								[
									targetDto,

									fullKeyToUpdate,

									valueForRpc,

									overridesDto,

									scopeToLangDto,
								],
							);

				try {
					await rpcCallPromise;
				} catch (error: any) {
					self._logError(
						`Config.update RPC for key='${fullKeyToUpdate}' failed:`,

						error,
					);

					// Rethrow to signal failure
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
		// Recursively revive URIs in the inspect result object
		if (!inspectInfo || typeof inspectInfo !== "object") {
			return inspectInfo;
		}

		const result: any = {};

		for (const key in inspectInfo) {
			if (Object.prototype.hasOwnProperty.call(inspectInfo, key)) {
				const value = inspectInfo[key];

				// Example: if a property could be a URI or contain URI components
				// This is a simplified check; a more robust one would check for specific DTO structures.
				if (
					typeof value === "object" &&
					value !== null &&
					value.$mid === MarshalledId.UriSimple
				) {
					result[key] = this._reviveApiArgument(value);
				} else if (
					Array.isArray(value) &&
					key === "languageIds" &&
					value.every(
						(item) =>
							typeof item === "object" &&
							item.$mid === MarshalledId.UriSimple,
					)
				) {
					// Unlikely for languageIds to be URIs, but as an example of array revival
					result[key] = value.map((item) =>
						this._reviveApiArgument(item),
					);
				} else if (typeof value === "object" && value !== null) {
					// Recurse for nested objects
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

		// Not logging for APPLICATION or MACHINE scopes as they don't take resource/window context like this.
		// MACHINE_OVERRIDABLE is also not typically accessed with scope args.
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

					// No resource/language scope provided if second arg is ExtensionId
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
