/*---------------------------------------------------------------------------------------------
 * Cocoon Configuration Shim (shims/configuration-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.workspace.getConfiguration` API (`IExtHostConfiguration`) for Cocoon.
 * It provides extensions with access to configuration values, proxying requests to Mountain,
 *
 *
 * which holds the consolidated configuration state.
 *
 * Responsibilities:
 * - `getConfiguration(section?, scope?)`:
 *   - Sends a `$getConfiguration` RPC request to Mountain (`MainThreadConfiguration`),
 *
 *
 *     passing the section and scope information.
 *   - Receives the *merged* configuration values for that scope from Mountain.
 *   - Returns a shimmed `vscode.WorkspaceConfiguration` object facade containing the received values.
 *   - *Fallback*: If RPC fails, returns values from the last known cache.
 * - Shimmed `WorkspaceConfiguration` Object:
 *   - `get(key, defaultValue)`: Looks up the value (handling nested keys) within the snapshot received
 *     from Mountain for the specific `getConfiguration` call (or from cache on fallback). Performs deep cloning.
 *   - `has(key)`: Checks for the key in the snapshot.
 *   - `inspect(key)`: Sends a `$inspect` RPC request to Mountain to get detailed scope information
 *     (default, global, workspace values) for a key.
 *   - `update(key, value, target?, scope?)`: Sends `$updateConfigurationOption` RPC request to Mountain
 *     to modify configuration values in the appropriate scope/file. Does *not* update the local shim's snapshot directly.
 * - Event Handling (`onDidChangeConfiguration`): Listens for configuration change
 *   notifications sent from Mountain via Vine/IPC (`ipc.onConfigurationChanged`), updates its internal full
 *   configuration cache, and fires the public `onDidChangeConfiguration` event with details about affected keys.
 *
 * Key Interactions:
 * - Provides the `vscode.workspace.getConfiguration` API and `vscode.WorkspaceConfiguration` objects.
 * - Interacts with the `RPCProtocol` via `this._rpcService.getProxy(MainContext.MainThreadConfiguration)`.
 * - Receives notifications via `cocoon-ipc.js`.
 * - Manages an internal cache of the last known full configuration snapshot.
 *--------------------------------------------------------------------------------------------*/

// Used by BaseCocoonShim._createEventEmitter
import { EventEmitter } from "events";
// For type signature of onDidChangeConfiguration
import { Event as VscodeEvent } from "vs/base/common/event";
// Assuming ProxyIdentifier constants
import { MainContext } from "vs/workbench/api/common/extHost.protocol";

// Assuming cocoon-ipc exports onConfigurationChanged
import * as ipc from "..";
// Assuming this is a class or interface
import { Uri } from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	IExtHostRpcService,
	ILogService,
	ProxyIdentifier,
	refineError,
} from "./_baseShim";

// --- Interfaces based on VS Code API and internal usage ---

// From vscode.d.ts (simplified)
export interface WorkspaceConfiguration {
	get<T>(section: string): T | undefined;

	get<T>(section: string, defaultValue: T): T;

	has(section: string): boolean;

	inspect<T>(section: string):
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
		| undefined;

	update(
		section: string,

		value: any,

		configurationTarget?: ConfigurationTarget | boolean | null,

		overrideInLanguage?: boolean,

		// overrideInLanguage is simplified
	): Promise<void>;
}

// From vscode.d.ts
export enum ConfigurationTarget {
	Global = 1,

	Workspace = 2,

	WorkspaceFolder = 3,
}

// For onDidChangeConfiguration event
export interface ConfigurationChangeEvent {
	affectsConfiguration(section: string, scope?: Uri | undefined): boolean;
}

// For initData structure (adjust based on actual initData)
interface InitData {
	configuration?: {
		// Typically a deeply nested object
		values?: any;
	};

	// Add other initData properties if used by this shim
}

// For IPC changeDetails
interface ConfigurationChangeDetails {
	keys?: string[];

	// [identifier, keys[]][]
	overrides?: [string, string[]][];
}

interface NewConfigData {
	values?: any;
}

// For MainThreadConfiguration RPC proxy
interface MainThreadConfigurationShape {
	$getConfiguration(
		section: string | null,

		overrides: IConfigurationOverrides,
	): Promise<any>;

	// { [key: string]: InspectInfo }

	$inspect(keys: string[]): Promise<any>;

	$updateConfigurationOption(
		target: ConfigurationTarget | null | undefined,

		key: string,

		value: any,

		overrides: IConfigurationOverrides,
	): Promise<void>;
}

// Protocol types (simplified for shim usage)
interface IConfigurationOverrides {
	// Should be UriComponents
	resource?: IUriComponents | null;

	languageId?: string | null;

	// VS Code also has this
	// overrideIdentifier?: string | null;
}

// Assuming UriComponents structure used by marshalling
interface IUriComponents {
	$mid?: number;

	scheme: string;

	authority: string;

	path: string;

	query: string;

	fragment: string;

	// Often added by marshallers
	external?: string;
}

// ConfigurationScope type, as used in vscode.workspace.getConfiguration
type ConfigurationScope =
	| Uri
	| { uri?: Uri; languageId?: string }
	| null
	| undefined;

export class ShimExtHostConfiguration extends BaseCocoonShim {
	public readonly _serviceBrand: undefined;

	#initData: InitData | undefined;

	#mainThreadConfigurationProxy: MainThreadConfigurationShape | null = null;

	// Cache of the latest full configuration snapshot
	#configuration: any = {};

	#onDidChangeConfigurationEmitter: EventEmitter = this._createEventEmitter();

	constructor(
		rpcService: IExtHostRpcService | undefined,

		// initData can be more strictly typed if its shape is known
		initData: InitData | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtHostConfiguration", rpcService, logService);

		this.#initData = initData;

		this._log("Initializing...");

		if (initData?.configuration?.values) {
			this.#configuration = initData.configuration.values;

			this._log("Initial configuration cache populated.");
		} else {
			this._logWarn("No initial configuration data provided.");

			this.#configuration = {};
		}

		if (this._rpcService) {
			this.#mainThreadConfigurationProxy = this._getProxy(
				MainContext.MainThreadConfiguration as ProxyIdentifier<MainThreadConfigurationShape>,
			);

			if (this.#mainThreadConfigurationProxy) {
				this._log("MainThreadConfiguration RPC proxy obtained.");
			}

			// Error logged by _getProxy if it returns null
		} else {
			this._logError(
				"RPCService is not available, cannot get MainThreadConfiguration proxy.",
			);
		}

		// Subscribe to internal configuration change events via IPC
		ipc.onConfigurationChanged(
			([newConfigData, changeDetails]: [
				NewConfigData,

				ConfigurationChangeDetails | undefined,
			]) => {
				const affectedKeys = changeDetails?.keys || [];

				const affectedOverrides = changeDetails?.overrides || [];

				this._log(
					`Received internal configChanged trigger. Affected keys: ${affectedKeys.join(", ")}. Overrides: ${affectedOverrides.length}`,
				);

				try {
					this.#configuration = newConfigData?.values || {};

					this._log("Internal configuration cache updated.");
				} catch (parseError: any) {
					this._logError(
						"Failed to update configuration cache from notification data:",

						parseError,
					);
				}

				const allAffectedKeys = new Set<string>(affectedKeys);

				affectedOverrides.forEach(([_identifier, overrideKeys]) => {
					overrideKeys.forEach((key) => allAffectedKeys.add(key));
				});

				const affectsConfiguration = (
					section: string,

					scope?: Uri,
				): boolean => {
					if (scope) {
						this._logWarnOnce(
							`ConfigurationChangeEvent.affectsConfiguration scope checking is NOT fully implemented.`,
						);
					}

					if (
						section === undefined ||
						section === null ||
						section === ""
					) {
						// Any change affects root
						return true;
					}

					for (const key of allAffectedKeys) {
						if (key === section || key.startsWith(section + ".")) {
							// Key is section or within section
							return true;
						}
					}

					return false;
				};

				this.#onDidChangeConfigurationEmitter.emit(
					// Use emit for Node's EventEmitter
					// The eventName used in _createEventFromEmitter
					"fire",

					Object.freeze({
						affectsConfiguration,
					} as ConfigurationChangeEvent),
				);

				this._log("Fired public onDidChangeConfiguration event.");
			},
		);

		this._log(
			"Subscribed to internal configuration change events via IPC.",
		);
	}

	// _uriToComponents is now inherited from BaseCocoonShim if Uri is one of the common types.
	// If it needs more specific behavior for configuration, it can be overridden here.
	// For now, let's assume BaseCocoonShim._convertApiArgToInternal handles Uri correctly.
	protected _uriToComponents(
		uri: Uri | undefined,
	): IUriComponents | undefined {
		if (!uri) return undefined;

		const components = this._convertApiArgToInternal(uri);

		// Check if it's a valid IUriComponents structure
		if (
			components &&
			typeof components.scheme === "string" &&
			typeof components.path === "string"
		) {
			return components as IUriComponents;
		}

		this._logWarn(
			"Failed to convert URI to components via _convertApiArgToInternal for configuration shim, falling back to manual (or consider specific override).",

			uri,
		);

		// Manual fallback from original JS (if _convertApiArgToInternal doesn't match this exact structure)
		try {
			return {
				// MarshalledId.UriSimple
				$mid: 1,

				scheme: uri.scheme,

				authority: uri.authority || "",

				path: uri.path,

				query: uri.query || "",

				fragment: uri.fragment || "",
			};
		} catch (e: any) {
			this._logError(
				"Failed to convert URI to components manually:",

				uri,

				e,
			);

			return undefined;
		}
	}

	public async getConfiguration(
		section?: string,

		// vscode.ConfigurationScope (Uri | { uri?, languageId? })
		scope?: ConfigurationScope,

		// extensionId ignored for now
		_extensionId?: string,
	): Promise<WorkspaceConfiguration> {
		// Returns vscode.WorkspaceConfiguration

		let scopeUri: Uri | undefined = undefined;

		let scopeLanguageId: string | undefined = undefined;

		if (scope instanceof Uri) {
			scopeUri = scope;
		} else if (scope && typeof scope === "object") {
			scopeUri = scope.uri;

			scopeLanguageId = scope.languageId;
		}

		const scopeUriStr =
			scopeUri?.toString() ??
			(typeof scope === "string" ? scope : "undefined");

		this._log(
			`getConfiguration requesting: section='${section}', scope='${scopeUriStr}'${scopeLanguageId ? `, lang='${scopeLanguageId}'` : ""}`,
		);

		if (!this.#mainThreadConfigurationProxy) {
			this._logError("Cannot getConfiguration: RPC proxy unavailable.");

			this._logWarn(
				"Returning configuration based on potentially stale cache.",
			);

			const relevantCache = this._getSectionFromCache(
				this.#configuration,

				section,
			);

			return this._createShimConfiguration(
				relevantCache || {},

				section || "",
			);
		}

		let configValues: any = {};

		try {
			const scopeUriComponent = this._uriToComponents(scopeUri);

			const overrides: IConfigurationOverrides = {
				resource: scopeUriComponent,

				languageId: scopeLanguageId,
			};

			configValues =
				await this.#mainThreadConfigurationProxy.$getConfiguration(
					section || null,

					overrides,
				);

			this._log(
				`getConfiguration received ${Object.keys(configValues || {}).length} top-level keys.`,
			);
		} catch (error: any) {
			const refinedError = refineError(
				error,

				this._logService,

				"getConfiguration",
			);

			this._logError(
				`getConfiguration RPC failed for section='${section}', scope='${scopeUriStr}':`,

				refinedError,
			);

			this._logWarn(
				"Falling back to cached configuration due to RPC error.",
			);

			const relevantCache = this._getSectionFromCache(
				this.#configuration,

				section,
			);

			configValues = relevantCache || {};
		}

		return this._createShimConfiguration(configValues || {}, section || "");
	}

	protected _getSectionFromCache(fullConfig: any, section?: string): any {
		if (!section) return fullConfig;

		const parts = section.split(".");

		let current = fullConfig;

		for (const part of parts) {
			if (
				current &&
				typeof current === "object" &&
				current !== null &&
				Object.prototype.hasOwnProperty.call(current, part)
			) {
				current = current[part];
			} else {
				// Section not found
				return undefined;
			}
		}

		return current;
	}

	protected _createShimConfiguration(
		values: any,

		sectionPrefix: string = "",
	): WorkspaceConfiguration {
		const lookupValue = (allValues: any, key: string): any => {
			// For `getConfiguration('')` or `config.get('')`
			if (!key && !sectionPrefix) {
				// getConfiguration('').get('') should return allValues
				try {
					return typeof allValues === "object" && allValues !== null
						? JSON.parse(JSON.stringify(allValues))
						: allValues;
				} catch (e: any) {
					this._logWarn(
						`Failed to deep clone root configuration object: ${e.message}`,
					);

					return allValues;
				}
			}

			const fullKey =
				sectionPrefix && key
					? `${sectionPrefix}.${key}`
					: sectionPrefix || key;

			if (!fullKey) {
				// if key is empty but sectionPrefix exists, or vice-versa
				const targetValue = sectionPrefix
					? allValues
					: this._getSectionFromCache(this.#configuration, key);

				try {
					return typeof targetValue === "object" &&
						targetValue !== null
						? JSON.parse(JSON.stringify(targetValue))
						: targetValue;
				} catch (e: any) {
					this._logWarn(
						`Failed to deep clone section value for '${fullKey}': ${e.message}`,
					);

					return targetValue;
				}
			}

			const parts = fullKey.split(".");

			// Always search from the root #configuration for fullKey
			let current = this.#configuration;

			for (const part of parts) {
				if (
					current &&
					typeof current === "object" &&
					current !== null &&
					Object.prototype.hasOwnProperty.call(current, part)
				) {
					current = current[part];
				} else {
					// Key part not found
					return undefined;
				}
			}

			// The `values` parameter to _createShimConfiguration is already section-specific from $getConfiguration
			// The lookup should be relative to `values` if `sectionPrefix` was used to obtain `values`.
			// Let's adjust: if sectionPrefix is present, `values` is the *already filtered* config.
			// If sectionPrefix is empty, `values` is the root config.

			// `values` is the snapshot for the current WorkspaceConfiguration instance
			let target = values;

			// We are looking for a sub-key within `values`
			const keyToLookup = key;

			const keyParts = keyToLookup.split(".");

			for (const part of keyParts) {
				if (
					target &&
					typeof target === "object" &&
					target !== null &&
					Object.prototype.hasOwnProperty.call(target, part)
				) {
					target = target[part];
				} else {
					return undefined;
				}
			}

			try {
				return typeof target === "object" && target !== null
					? JSON.parse(JSON.stringify(target))
					: target;
			} catch (e: any) {
				this._logWarn(
					`Failed to deep clone config value for key '${key}': ${e.message}`,
				);

				return target;
			}
		};

		const workspaceConfigShim: WorkspaceConfiguration = {
			get: <T>(key: string, defaultValue?: T): T | undefined => {
				const value = lookupValue(values, key);

				return value !== undefined ? value : defaultValue;
			},

			has: (key: string): boolean => {
				return lookupValue(values, key) !== undefined;
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
				const fullKey = sectionPrefix ? `${sectionPrefix}.${key}` : key;

				this._log(
					`Configuration.inspect requesting Mountain: key='${fullKey}'`,
				);

				if (!this.#mainThreadConfigurationProxy) {
					this._logError(
						"Cannot inspect configuration: RPC proxy unavailable.",
					);

					return undefined;
				}

				try {
					const inspectInfo =
						await this.#mainThreadConfigurationProxy.$inspect([
							fullKey,
						]);

					if (!inspectInfo) {
						this._logWarn(
							`Configuration.inspect for key='${fullKey}' returned null/undefined.`,
						);

						return undefined;
					}

					// Deep clone result
					return typeof inspectInfo === "object" &&
						inspectInfo !== null
						? JSON.parse(JSON.stringify(inspectInfo))
						: inspectInfo;
				} catch (error: any) {
					const refinedError = refineError(
						error,

						this._logService,

						"inspect",
					);

					this._logError(
						`Configuration.inspect RPC failed for key='${fullKey}':`,

						refinedError,
					);

					return undefined;
				}
			},

			update: async (
				key: string,

				value: any,

				// ConfigurationTarget can also be { global, workspace, workspaceFolder, uri }

				configurationTarget?: ConfigurationTarget | boolean | null,

				// Simplified, VSCode uses ConfigurationScope (Uri | {uri?, languageId?}) for target's scope override
				overrideInLanguage?: boolean,
			): Promise<void> => {
				const fullKey = sectionPrefix ? `${sectionPrefix}.${key}` : key;

				let targetNum: ConfigurationTarget | undefined = undefined;

				let scopeUriForUpdate: Uri | undefined = undefined;

				let languageIdForUpdate: string | undefined = undefined;

				if (
					typeof configurationTarget === "object" &&
					configurationTarget !== null &&
					"uri" in configurationTarget
				) {
					// It's a ConfigurationScope object like { uri?: Uri, languageId?: string }

					// This is not how ConfigurationTarget enum/boolean is typically used in `update`.
					// The third arg is usually ConfigurationTarget enum or boolean for global/workspace.
					// The fourth arg (overrideInLanguage) is a boolean indicating if it's a language-specific override.
					// Let's assume `configurationTarget` here maps to the `target` param of $updateConfigurationOption,

					// and if it's an object with `uri`, that `uri` is for the `overrides.resource`.

					this._logWarn(
						"Using object for configurationTarget in `update` is complex; interpreting as scope override.",
					);

					const scopeLikeTarget = configurationTarget as {
						uri?: Uri;

						languageId?: string;

						global?: boolean;

						workspace?: boolean;

						workspaceFolder?: boolean;
					};

					scopeUriForUpdate = scopeLikeTarget.uri;

					languageIdForUpdate = scopeLikeTarget.languageId;

					if (scopeLikeTarget.global === true)
						targetNum = ConfigurationTarget.Global;
					else if (scopeLikeTarget.workspaceFolder === true)
						targetNum = ConfigurationTarget.WorkspaceFolder;
					else if (scopeLikeTarget.workspace === true)
						targetNum = ConfigurationTarget.Workspace;
					// Default if not specified in this object form
					else
						targetNum = scopeUriForUpdate
							? ConfigurationTarget.WorkspaceFolder
							: ConfigurationTarget.Workspace;
				} else if (configurationTarget === true) {
					targetNum = ConfigurationTarget.Global;
				} else if (configurationTarget === false) {
					targetNum = ConfigurationTarget.Workspace;
				} else if (
					typeof configurationTarget === "number" &&
					Object.values(ConfigurationTarget).includes(
						configurationTarget,
					)
				) {
					targetNum = configurationTarget as ConfigurationTarget;
				} else if (
					configurationTarget === undefined ||
					configurationTarget === null
				) {
					// Default logic: if scopeUriForUpdate is set (e.g. from a ConfigurationScope passed to getConfiguration),

					// it might imply WorkspaceFolder. Otherwise, typically Global or Workspace.
					// The `overrideInLanguage` parameter implies a resource scope might be relevant.
					// This logic is tricky without knowing if `overrideInLanguage` provides scope or just indicates lang-specific.
					// For now, let's assume if `overrideInLanguage` is true, it refers to a resource-specific language override.
					// VS Code's API: update(section, value, target?, scopeOverride?)
					// The `overrideInLanguage` boolean is not standard for `vscode.WorkspaceConfiguration.update`.
					// The original JS code's interpretation of `configurationTarget` was a bit mixed.
					// Let's stick to the standard `vscode.WorkspaceConfiguration.update` signature where the 3rd param is `ConfigurationTarget | boolean`.
					// The 4th param `overrideInLanguage` is usually for `scopeOverride` which can be `ConfigurationScope`.
					// Let's assume `overrideInLanguage` being true implies we need to use the `scopeUri` from the `getConfiguration` call if `scope` was passed there.
					// This part is confusing in the original JS.
					// Let's simplify based on common usage of `update(key, value, target)`
					// If overrideInLanguage (4th param) is actually a ConfigurationScope:
					if (
						typeof overrideInLanguage === "object" &&
						overrideInLanguage !== null
					) {
						const scopeOverride = overrideInLanguage as {
							uri?: Uri;

							languageId?: string;
						};

						scopeUriForUpdate = scopeOverride.uri;

						languageIdForUpdate = scopeOverride.languageId;
					}

					targetNum = scopeUriForUpdate
						? ConfigurationTarget.WorkspaceFolder
						: // Defaulting to Global if no resource
							ConfigurationTarget.Global;

					this._logWarn(
						`Configuration.update: No explicit target, defaulting to ${targetNum === ConfigurationTarget.Global ? "Global" : "WorkspaceFolder based on scope"}.`,
					);
				} else {
					this._logError(
						"Invalid configurationTarget for update:",

						configurationTarget,
					);

					throw new Error("Invalid configurationTarget for update.");
				}

				let scopeUriComponent =
					this._uriToComponents(scopeUriForUpdate);

				this._log(
					`Configuration.update requesting Mountain: key='${fullKey}', value='${JSON.stringify(value)}', target=${targetNum}, scopeUri=${scopeUriForUpdate?.toString()}`,
				);

				if (!this.#mainThreadConfigurationProxy) {
					const msg =
						"Cannot update configuration: RPC proxy unavailable.";

					this._logError(msg);

					throw new Error(msg);
				}

				try {
					const overrides: IConfigurationOverrides = {
						resource: scopeUriComponent,

						// languageId here
						languageId: languageIdForUpdate,
					};

					await this.#mainThreadConfigurationProxy.$updateConfigurationOption(
						targetNum,

						fullKey,

						value,

						overrides,
					);

					this._log(
						`Configuration.update successful for key='${fullKey}'`,
					);
				} catch (error: any) {
					const refinedError = refineError(
						error,

						this._logService,

						"update",
					);

					this._logError(
						`Configuration.update RPC failed for key='${fullKey}':`,

						refinedError,
					);

					throw refinedError;
				}
			},
		};

		return new Proxy(workspaceConfigShim, {
			get(target, prop: string | symbol, receiver) {
				if (
					prop in target ||
					typeof prop === "symbol" ||
					prop === "then"
				) {
					return Reflect.get(target, prop, receiver);
				}

				if (typeof prop === "string") {
					return target.get(prop);
				}

				return Reflect.get(target, prop, receiver);
			},

			has(target, prop: string | symbol) {
				if (prop in target || typeof prop === "symbol") {
					return Reflect.has(target, prop);
				}

				if (typeof prop === "string") {
					return target.has(prop);
				}

				return Reflect.has(target, prop);
			},

			// Cast to WorkspaceConfiguration
		}) as WorkspaceConfiguration;
	}

	public get onDidChangeConfiguration(): VscodeEvent<ConfigurationChangeEvent> {
		return this._createEventFromEmitter<ConfigurationChangeEvent>(
			this.#onDidChangeConfigurationEmitter,

			// ensure eventName matches emitter.emit
			"fire",
		);
	}
}

// Original JS
// module.exports = { ShimExtHostConfiguration };

// export class ShimExtHostConfiguration handles this in TS.
