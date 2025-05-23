/*---------------------------------------------------------------------------------------------
 * Cocoon Diagnostics Shim (shims/diagnostics-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.languages.createDiagnosticCollection` API (`IExtHostDiagnostics`)
 * and the returned `vscode.DiagnosticCollection` interface for Cocoon. Allows extensions
 * to report problems (diagnostics/markers) to the core editor.
 *
 * Responsibilities:
 * - `ShimDiagnosticsService`:
 *   - `createDiagnosticCollection(name?)`: Creates a new `ShimDiagnosticCollectionImpl` instance
 *     with a unique owner ID. Manages multiple collections.
 *   - `getDiagnostics()`: Proxies to Mountain to get aggregated diagnostics for a resource.
 *   - `onDidChangeDiagnostics`: Event that fires when diagnostics change (needs notifications from Mountain).
 * - `ShimDiagnosticCollectionImpl`:
 *   - Implements `vscode.DiagnosticCollection`.
 *   - `set(uri | entries)`: Updates diagnostics, converts to `IMarkerData`, and sends to Mountain via `$changeMany`.
 *   - `delete(uri)`: Removes diagnostics for a URI, calls `$changeMany` with `undefined` markers.
 *   - `clear()`: Removes all diagnostics for this collection, calls `$clear` RPC.
 *   - `get()`, `has()`, `forEach()`: Operate on the local cache.
 *   - `dispose()`: Clears the collection on the main thread via `$clear`.
 *
 * Key Interactions:
 * - Provides `vscode.languages.createDiagnosticCollection`, `vscode.languages.getDiagnostics`, `vscode.languages.onDidChangeDiagnostics`.
 * - Interacts with `RPCProtocol` via `this._rpcService.getProxy(MainContext.MainThreadDiagnostics)`.
 * - Converts `vscode.Diagnostic` to `IMarkerData` format.
 * - Mountain would call `$onDidChangeDiagnostics` on `ExtHostDiagnostics` (this service) to signal changes.
 *--------------------------------------------------------------------------------------------*/

// Assuming API objects from 'vscode' shim
import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
import {
	IMarkerData,
	RelatedInformation as MarkerRelatedInformation,
	MarkerSeverity,
	MarkerTag,
	// For IMarkerData structure
} from "vs/platform/markers/common/markers";
import {
	ExtHostContext,
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";
import {
	Diagnostic,
	DiagnosticRelatedInformation,
	DiagnosticSeverity,
	DiagnosticTag,
	Uri,
	Location as VscodeLocation,
	// Renamed to avoid conflict if Range is used internally
	Range as VscodeRange,
	type DiagnosticCollection,
	// For onDidChangeDiagnostics event payload
	// Already imported
	// Uri as VscodeUri,
} from "vscode";

import {
	BaseCocoonShim,
	refineError,
	type IExtHostRpcService,
	type ILogService,
	type ProxyIdentifier,
} from "./_baseShim";

// TODO: Ensure IMarkerData, MarkerSeverity, MarkerTag, RelatedInformation interfaces/enums are correctly imported or defined
// if 'vs/platform/markers/common/markers' is not available. For now, I'll define simplified local versions.

// --- Local type definitions if VS Code internals are not directly available ---
// These should match the actual structures used by the MainThreadDiagnostics service.

interface ILocalMarkerData {
	// Simplified version of IMarkerData
	// Corresponds to MarkerSeverity
	severity: number;

	message: string;

	startLineNumber: number;

	startColumn: number;

	endLineNumber: number;

	endColumn: number;

	source?: string;

	// target is IUriComponents
	code?: string | { value: string; target: ILocalUriComponents };

	relatedInformation?: ILocalRelatedInformation[];

	// Corresponds to MarkerTag[]
	tags?: number[];

	// owner is usually implicit or part of the RPC call itself
	// owner?: string;

	// resource is usually part of the entry tuple [uri, markers]
	// resource?: ILocalUriComponents;
}

interface ILocalRelatedInformation {
	resource: ILocalUriComponents;

	message: string;

	startLineNumber: number;

	startColumn: number;

	endLineNumber: number;

	endColumn: number;
}

interface ILocalUriComponents {
	// Used for RPC, can be simplified from full Uri if needed
	scheme: string;

	authority?: string;

	path: string;

	query?: string;

	fragment?: string;

	// Often included for debugging or by marshallers
	external?: string;

	// MarshalledId.Uri a common pattern
	$mid?: 1;
}

// Local enum mapping (ensure these values match VS Code's MarkerSeverity)
enum LocalMarkerSeverity {
	Hint = 1,

	Info = 2,

	Warning = 4,

	Error = 8,
}

// Ensure these values match VS Code's MarkerTag
enum LocalMarkerTag {
	Unnecessary = 1,

	Deprecated = 2,
}

// For MainThreadDiagnostics RPC proxy
interface MainThreadDiagnosticsShape {
	$changeMany(
		owner: string,

		entries: [ILocalUriComponents, ILocalMarkerData[] | undefined][],
	): Promise<void>;

	$clear(owner: string): Promise<void>;

	// For getDiagnostics():
	$getMany(resourceFilter?: ILocalUriComponents): Promise<ILocalMarkerData[]>;
}

// For ExtHostDiagnostics (methods called BY Mountain)
interface ExtHostDiagnosticsShape {
	// Method for Mountain to push diagnostic changes to this ExtHost instance
	$acceptDiagnosticsChanged(uris: ILocalUriComponents[]): void;
}

type DiagnosticEntry = [Uri, readonly Diagnostic[] | undefined | null];

class ShimDiagnosticCollectionImpl implements DiagnosticCollection {
	readonly #nameProp?: string;

	readonly #owner: string;

	#proxy: MainThreadDiagnosticsShape | null;

	#logService?: ILogService;

	#isDisposed = false;

	// Key: uri.toString()
	readonly #data = new Map<string, Diagnostic[]>();

	constructor(
		name: string | undefined,

		owner: string,

		proxy: MainThreadDiagnosticsShape | null,

		logService?: ILogService,
	) {
		this.#nameProp = name;

		this.#owner = owner;

		this.#proxy = proxy;

		this.#logService = logService;

		this._log(
			`Created: name='${name || "(unnamed)"}', owner='${this.#owner}'`,
		);
	}

	private _log(msg: string, ...args: any[]): void {
		this.#logService?.trace(
			`[DiagCol][${this.#nameProp || "unnamed"}(${this.#owner})] ${msg}`,

			...args,
		);
	}

	private _logError(msg: string, ...args: any[]): void {
		this.#logService?.error(
			`[DiagCol][${this.#nameProp || "unnamed"}(${this.#owner})] ${msg}`,

			...args,
		);
	}

	private _logWarn(msg: string, ...args: any[]): void {
		this.#logService?.warn(
			`[DiagCol][${this.#nameProp || "unnamed"}(${this.#owner})] ${msg}`,

			...args,
		);
	}

	private _validate(): void {
		if (this.#isDisposed)
			throw new Error("DiagnosticCollection has been disposed");
	}

	get name(): string {
		return this.#nameProp || "";
	}

	public set(
		uri: Uri,

		diagnostics: readonly Diagnostic[] | undefined | null,
	): void;

	public set(entries: readonly DiagnosticEntry[]): void;

	public set(
		first: Uri | readonly DiagnosticEntry[],

		diagnostics?: readonly Diagnostic[] | undefined | null,
	): void {
		this._validate();

		const toSync = new Map<string, Diagnostic[] | undefined>();

		if (first instanceof Uri) {
			const uriStr = first.toString();

			// this._log(`set single: ${uriStr}, count: ${diagnostics?.length ?? 0}`);

			if (
				diagnostics === undefined ||
				diagnostics === null ||
				diagnostics.length === 0
			) {
				if (this.#data.delete(uriStr)) toSync.set(uriStr, undefined);
			} else {
				const diagsCopy = [...diagnostics];

				this.#data.set(uriStr, diagsCopy);

				toSync.set(uriStr, diagsCopy);
			}
		} else if (Array.isArray(first)) {
			// this._log(`set multiple: ${first.length} entries`);

			for (const [uri, diags] of first) {
				if (uri instanceof Uri) {
					const uriStr = uri.toString();

					if (
						diags === undefined ||
						diags === null ||
						diags.length === 0
					) {
						if (this.#data.delete(uriStr))
							toSync.set(uriStr, undefined);
					} else {
						const diagsCopy = [...diags];

						this.#data.set(uriStr, diagsCopy);

						toSync.set(uriStr, diagsCopy);
					}
				} else {
					this._logWarn(
						"Skipping invalid URI in 'set' entries:",

						uri,
					);
				}
			}
		} else {
			this._logError("Invalid arguments to DiagnosticCollection.set");

			return;
		}

		if (toSync.size > 0 && this.#proxy) {
			const entriesForProxy: [
				ILocalUriComponents,
				ILocalMarkerData[] | undefined,
			][] = [];

			for (const [uriStr, diags] of toSync) {
				let markers: ILocalMarkerData[] | undefined = undefined;

				if (diags) {
					try {
						markers = diags.map((d) =>
							this._convertDiagnosticToMarkerData(d),
						);
					} catch (conversionError: any) {
						this._logError(
							`Error converting diagnostics to markers for ${uriStr}: ${conversionError.message || conversionError}`,
						);

						continue;
					}
				}

				try {
					const uri = Uri.parse(uriStr);

					const uriComponents = this._uriToComponents(uri);

					if (uriComponents)
						entriesForProxy.push([uriComponents, markers]);
					else
						this._logError(
							`Failed to convert URI '${uriStr}' to components. Skipping sync.`,
						);
				} catch (e: any) {
					this._logError(
						`Error parsing URI '${uriStr}' for proxy: ${e.message || e}. Skipping sync.`,
					);
				}
			}

			if (entriesForProxy.length > 0) {
				this._log(
					`Sending ${entriesForProxy.length} diagnostic change(s) via $changeMany.`,
				);

				this.#proxy
					.$changeMany(this.#owner, entriesForProxy)
					.catch((err) =>
						this._logError(
							`$changeMany RPC call failed:`,

							refineError(err, this.#logService, "$changeMany"),
						),
					);
			}
		}
	}

	public delete(uri: Uri): void {
		this._validate();

		if (!(uri instanceof Uri)) {
			this._logError("Invalid URI to delete:", uri);

			return;
		}

		const uriStr = uri.toString();

		if (this.#data.delete(uriStr)) {
			this._log(`Deleted diagnostics locally for ${uriStr}`);

			if (this.#proxy) {
				const uriComponents = this._uriToComponents(uri);

				if (uriComponents) {
					this._log(
						`Sending deletion via $changeMany for URI: ${uriStr}`,
					);

					this.#proxy
						.$changeMany(this.#owner, [[uriComponents, undefined]])
						.catch((err) =>
							this._logError(
								`$changeMany RPC for delete failed:`,

								refineError(err, this.#logService, "delete"),
							),
						);
				} else {
					this._logError(
						`Failed to convert URI ${uriStr} to components for delete sync.`,
					);
				}
			}
		}
	}

	public clear(): void {
		this._validate();

		if (this.#data.size > 0) {
			this._log(`Clearing all ${this.#data.size} URIs locally.`);

			// For potential event
			const urisCleared = Array.from(this.#data.keys());

			this.#data.clear();

			if (this.#proxy) {
				this._log(`Sending $clear notification.`);

				this.#proxy.$clear(this.#owner).catch((err) =>
					this._logError(
						`$clear RPC call failed:`,

						refineError(err, this._logService, "clear"),
					),
				);

				// TODO: If onDidChangeDiagnostics is implemented in ShimDiagnosticsService,

				// it should be notified here about the cleared URIs.
				// (this as any)._diagnosticsService?.$notifyDiagnosticsChanged(urisCleared.map(u => Uri.parse(u)));
			}
		} else {
			this._log("clear() called, but collection was already empty.");
		}
	}

	public forEach(
		callback: (
			uri: Uri,

			diagnostics: readonly Diagnostic[],

			collection: DiagnosticCollection,
		) => any,

		thisArg?: any,
	): void {
		this._validate();

		this.#data.forEach((diags, uriStr) => {
			let uri: Uri;

			try {
				uri = Uri.parse(uriStr);
			} catch (e: any) {
				this._logError(`Error parsing URI '${uriStr}' in forEach:`, e);

				return;
			}

			try {
				callback.call(thisArg, uri, Object.freeze([...diags]), this);
			} catch (cbError: any) {
				this._logError(
					`Error in forEach callback for URI ${uriStr}:`,

					cbError,
				);
			}
		});
	}

	public get(uri: Uri): readonly Diagnostic[] | undefined {
		this._validate();

		if (!(uri instanceof Uri)) {
			this._logError("Invalid URI to get:", uri);

			return undefined;
		}

		const diags = this.#data.get(uri.toString());

		return diags ? Object.freeze([...diags]) : undefined;
	}

	public has(uri: Uri): boolean {
		this._validate();

		if (!(uri instanceof Uri)) {
			this._logError("Invalid URI to has:", uri);

			return false;
		}

		return this.#data.has(uri.toString());
	}

	public dispose(): void {
		if (!this.#isDisposed) {
			this._log(`dispose called`);

			this.#isDisposed = true;

			// Clears diagnostics on main thread
			this.clear();

			this.#proxy = null;

			this.#logService = undefined;

			this.#data.clear();

			// TODO: Notify ShimDiagnosticsService that this collection is disposed
			// so it can be removed from any internal tracking if needed.
		}
	}

	private _uriToComponents(uri: Uri): ILocalUriComponents | undefined {
		const components = (
			this as any as BaseCocoonShim
		)._convertApiArgToInternal(uri);

		if (
			components?.$mid === 1 /* MarshalledId.UriSimple */ ||
			(components?.scheme && components?.path)
		) {
			return components as ILocalUriComponents;
		}

		this._logError(
			"Failed to convert Uri to ILocalUriComponents via base shim.",

			uri,
		);

		// Fallback if base shim doesn't produce desired structure
		if (uri instanceof Uri) {
			return {
				scheme: uri.scheme,

				authority: uri.authority,

				path: uri.path,

				query: uri.query,

				fragment: uri.fragment,

				external: uri.toString(true),
			};
		}

		return undefined;
	}

	private _convertDiagnosticToMarkerData(diag: Diagnostic): ILocalMarkerData {
		const convertSeverity = (
			sev: DiagnosticSeverity,
		): LocalMarkerSeverity => {
			switch (sev) {
				case DiagnosticSeverity.Error:
					return LocalMarkerSeverity.Error;

				case DiagnosticSeverity.Warning:
					return LocalMarkerSeverity.Warning;

				case DiagnosticSeverity.Information:
					return LocalMarkerSeverity.Info;

				case DiagnosticSeverity.Hint:
					return LocalMarkerSeverity.Hint;

				default:
					this._logWarn(
						`Unknown DiagnosticSeverity: ${sev}, defaulting to Error.`,
					);

					return LocalMarkerSeverity.Error;
			}
		};

		let markerCode:
			| string
			| { value: string; target: ILocalUriComponents }
			| undefined = undefined;

		if (diag.code !== undefined && diag.code !== null) {
			if (
				typeof diag.code === "object" &&
				diag.code.target instanceof Uri
			) {
				const targetUriComponents = this._uriToComponents(
					diag.code.target,
				);

				if (targetUriComponents)
					markerCode = {
						value: String(diag.code.value),

						target: targetUriComponents,
					};
				else {
					this._logWarn(
						"Failed to convert target URI in diagnostic code.",

						diag.code,
					);

					markerCode = String(diag.code.value);
				}
			} else if (typeof diag.code === "object")
				markerCode = String(diag.code.value);
			else markerCode = String(diag.code);
		}

		const relatedInformation = diag.relatedInformation
			?.map((ri) => {
				const resource = this._uriToComponents(ri.location.uri);

				if (!resource) {
					this._logWarn(
						"Failed to convert URI for relatedInformation:",

						ri.location.uri,
					);

					return undefined;
				}

				return {
					resource,

					message: ri.message,

					startLineNumber: ri.location.range.start.line + 1,

					startColumn: ri.location.range.start.character + 1,

					endLineNumber: ri.location.range.end.line + 1,

					endColumn: ri.location.range.end.character + 1,
				};
			})
			.filter((ri) => ri !== undefined) as
			| ILocalRelatedInformation[]
			| undefined;

		const tags = diag.tags
			?.map((tag) => {
				if (tag === DiagnosticTag.Unnecessary)
					return LocalMarkerTag.Unnecessary;

				if (tag === DiagnosticTag.Deprecated)
					return LocalMarkerTag.Deprecated;

				// TODO: Add other MarkerTag mappings if VS Code introduces more.
				this._logWarn(`Unsupported DiagnosticTag: ${tag}, omitting.`);

				return undefined;
			})
			.filter((t) => t !== undefined) as LocalMarkerTag[] | undefined;

		if (!diag.range)
			throw new Error(
				`Diagnostic is missing 'range': ${JSON.stringify(diag)}`,
			);

		return {
			severity: convertSeverity(diag.severity),

			message: diag.message || "",

			startLineNumber: diag.range.start.line + 1,

			startColumn: diag.range.start.character + 1,

			endLineNumber: diag.range.end.line + 1,

			endColumn: diag.range.end.character + 1,

			source: diag.source,

			code: markerCode,

			relatedInformation,

			tags,
		};
	}
}

export class ShimDiagnosticsService
	extends BaseCocoonShim
	implements ExtHostDiagnosticsShape
{
	public readonly _serviceBrand: undefined;

	#mainThreadDiagnosticsProxy: MainThreadDiagnosticsShape | null = null;

	#collectionCounter = 0;

	readonly #onDidChangeDiagnosticsEmitter = new VscodeEmitter<
		readonly Uri[]
		// Uri from vscode API
	>();

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtHostDiagnostics", rpcService, logService);

		if (this._rpcService) {
			this.#mainThreadDiagnosticsProxy = this._getProxy(
				MainContext.MainThreadDiagnostics as ProxyIdentifier<MainThreadDiagnosticsShape>,
			);

			// Register self for RPC calls from MainThread
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostDiagnostics as ProxyIdentifier<ExtHostDiagnosticsShape>,

					this,
				);

				this._log(
					"Registered self for incoming RPC calls (ExtHostDiagnostics).",
				);
			} catch (e: any) {
				this._logError("Failed to set ExtHostDiagnostics for RPC:", e);
			}
		}

		if (!this.#mainThreadDiagnosticsProxy) {
			this._logError(
				"Failed to get MainThreadDiagnostics proxy! Diagnostic collections will not sync effectively.",
			);
		}
	}

	public createDiagnosticCollection(name?: string): DiagnosticCollection {
		this._log(`createDiagnosticCollection called: name='${name}'`);

		if (!this.#mainThreadDiagnosticsProxy) {
			this._logError(
				`Cannot create DiagnosticCollection '${name || ""}', RPC proxy unavailable. Returning NOP collection.`,
			);

			return this._createNopCollection(name);
		}

		const owner = `cocoon_diag_${name || "anon"}_${this.#collectionCounter++}`;

		this._log(`Assigning owner ID: ${owner}`);

		// Pass a reference to this service if the collection needs to notify it (e.g., for onDidChangeDiagnostics)
		return new ShimDiagnosticCollectionImpl(
			name,

			owner,

			this.#mainThreadDiagnosticsProxy,

			this._logService,
		);
	}

	private _createNopCollection(name?: string): DiagnosticCollection {
		// Implementation from previous step, ensure it matches DiagnosticCollection interface
		this._logWarn(
			`Creating NOP DiagnosticCollection: name='${name || ""}'`,
		);

		const nopMethods = {
			set: () => {},

			delete: () => {},

			clear: () => {},

			forEach: () => {},

			get: () => undefined,

			has: () => false,

			dispose: () => {},
		};

		return Object.freeze({
			name: name || "",

			...nopMethods,
		}) as DiagnosticCollection;
	}

	public async getDiagnostics(
		resource?: Uri,
	): Promise<readonly Diagnostic[]> {
		this._log(`getDiagnostics for resource: ${resource?.toString()}`);

		if (resource && !(resource instanceof Uri)) {
			this._logError(
				"Invalid resource URI passed to getDiagnostics:",

				resource,
			);

			return [];
		}

		if (!this.#mainThreadDiagnosticsProxy?.$getMany) {
			// Using the Greek name
			this._logWarn(
				"MainThreadDiagnostics.$getMany not available. Cannot fetch diagnostics.",
			);

			return [];
		}

		try {
			const uriComponents = resource
				? ((this as any as BaseCocoonShim)._convertApiArgToInternal(
						resource,
					) as ILocalUriComponents)
				: undefined;

			const markersData =
				await this.#mainThreadDiagnosticsProxy.$getMany(uriComponents);

			return this._convertMarkersToDiagnostics(markersData || []);
		} catch (e: any) {
			this._logError(
				"Failed to get diagnostics from main thread:",

				refineError(e, this._logService, "getDiagnostics"),
			);

			return [];
		}
	}

	public get onDidChangeDiagnostics(): VscodeEvent<readonly Uri[]> {
		return this.#onDidChangeDiagnosticsEmitter.event;
	}

	// RPC method called by MainThreadDiagnostics when diagnostics change on main side
	public $acceptDiagnosticsChanged(
		uriComponentsArray: ILocalUriComponents[],
	): void {
		this._log(
			`Received $acceptDiagnosticsChanged for ${uriComponentsArray.length} URIs.`,
		);

		const changedUris: Uri[] = [];

		for (const uriComp of uriComponentsArray) {
			try {
				// Use BaseCocoonShim's _reviveApiArgument for URI revival
				const revivedUri = (
					this as any as BaseCocoonShim
				)._reviveApiArgument<Uri>(uriComp);

				if (revivedUri) {
					changedUris.push(revivedUri);
				} else {
					this._logWarn(
						"$acceptDiagnosticsChanged: Failed to revive URI component",

						uriComp,
					);
				}
			} catch (e) {
				this._logError(
					"$acceptDiagnosticsChanged: Error reviving URI component",

					uriComp,

					e,
				);
			}
		}

		if (changedUris.length > 0) {
			this.#onDidChangeDiagnosticsEmitter.fire(
				Object.freeze(changedUris),
			);
		}
	}

	private _convertMarkersToDiagnostics(
		markers: ILocalMarkerData[],
	): Diagnostic[] {
		return markers.map((marker) => {
			// Use VscodeRange alias
			const range = new VscodeRange(
				marker.startLineNumber - 1,

				marker.startColumn - 1,

				marker.endLineNumber - 1,

				marker.endColumn - 1,
			);

			let severity: DiagnosticSeverity;

			switch (marker.severity) {
				case LocalMarkerSeverity.Error:
					severity = DiagnosticSeverity.Error;

					break;

				case LocalMarkerSeverity.Warning:
					severity = DiagnosticSeverity.Warning;

					break;

				case LocalMarkerSeverity.Info:
					severity = DiagnosticSeverity.Information;

					break;

				case LocalMarkerSeverity.Hint:
					severity = DiagnosticSeverity.Hint;

					break;

				default:
					severity = DiagnosticSeverity.Error;

					this._logWarn("Unknown marker severity:", marker.severity);
			}

			const diag = new Diagnostic(range, marker.message, severity);

			if (marker.source) diag.source = marker.source;

			if (typeof marker.code === "string") {
				diag.code = marker.code;
			} else if (marker.code && typeof marker.code === "object") {
				// { value, target }

				// Use BaseCocoonShim's _reviveApiArgument for URI revival
				const targetUri = (
					this as any as BaseCocoonShim
				)._reviveApiArgument<Uri>(marker.code.target);

				if (targetUri) {
					diag.code = { value: marker.code.value, target: targetUri };
				} else {
					// Fallback to just value
					diag.code = marker.code.value;

					this._logWarn(
						"Failed to revive target URI for diagnostic code:",

						marker.code.target,
					);
				}
			}

			if (marker.relatedInformation) {
				diag.relatedInformation = marker.relatedInformation
					.map((riDto) => {
						const locUri = (
							this as any as BaseCocoonShim
						)._reviveApiArgument<Uri>(riDto.resource);

						if (!locUri) {
							this._logWarn(
								"Failed to revive URI for relatedInformation:",

								riDto.resource,
							);

							return null;
						}

						const locRange = new VscodeRange(
							riDto.startLineNumber - 1,

							riDto.startColumn - 1,

							riDto.endLineNumber - 1,

							riDto.endColumn - 1,
						);

						return new DiagnosticRelatedInformation(
							new VscodeLocation(locUri, locRange),

							riDto.message,
						);
					})
					.filter(
						(ri) => ri !== null,
					) as DiagnosticRelatedInformation[];
			}

			if (marker.tags) {
				diag.tags = marker.tags
					.map((tagValue) => {
						if (tagValue === LocalMarkerTag.Unnecessary)
							return DiagnosticTag.Unnecessary;

						if (tagValue === LocalMarkerTag.Deprecated)
							return DiagnosticTag.Deprecated;

						// TODO: Map other MarkerTags if VS Code introduces more.
						// Unknown tag
						return undefined;
					})
					.filter((t) => t !== undefined) as DiagnosticTag[];
			}

			return diag;
		});
	}
}

// --- END OF FILE diagnostics-shim.ts ---
