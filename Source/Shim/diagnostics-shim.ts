/*---------------------------------------------------------------------------------------------
 * Cocoon Diagnostics Shim (shims/diagnostics-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.languages.createDiagnosticCollection` API (`IExtHostDiagnostics`)
 * and the returned `vscode.DiagnosticCollection` interface for Cocoon. Allows extensions
 * to report problems (diagnostics/markers) to the core editor.
 *
 * Responsibilities:
 * - `ShimDiagnosticsService`:
 *   - `createDiagnosticCollection(name?)`: Creates a new `ShimDiagnosticCollection` instance
 *     with a unique owner ID. Manages multiple collections.
 *   - `getDiagnostics()`: (TODO/Placeholder) Would need to proxy to Mountain to get aggregated diagnostics.
 * - `ShimDiagnosticCollection`:
 *   - `set(uri | entries)`: Updates diagnostics for specific URIs internally. Treats empty arrays,
 *
 *     null, or undefined diagnostics as a clear operation for that URI. Converts
 *     `vscode.Diagnostic` objects into the `IMarkerData` structure expected by the main thread.
 *     Sends updates/clears via `$changeMany` RPC call to Mountain, passing the unique `owner` ID.
 *   - `delete(uri)`: Removes diagnostics for a URI and calls `$changeMany` with `undefined` markers.
 *   - `clear()`: Removes all diagnostics for this collection and calls `$clear` RPC.
 *   - `get()`, `has()`, `forEach()`: Operate on the local cache (`#data`).
 *   - `dispose()`: Clears the collection on the main thread via `$clear`.
 *
 * Key Interactions:
 * - Provides `vscode.languages.createDiagnosticCollection` and `vscode.DiagnosticCollection`.
 * - Interacts with `RPCProtocol` via `this._rpcService.getProxy(MainContext.MainThreadDiagnostics)`.
 * - Converts `vscode.Diagnostic` to `IMarkerData` format (using `MarkerSeverity` numbers).
 * - Manages local diagnostic state per collection, identified by a unique `owner` string.
 *--------------------------------------------------------------------------------------------*/

// For onDidChangeDiagnostics type
import { Event as VscodeEvent } from "vs/base/common/event";
// Assuming ProxyIdentifier constants
import { MainContext } from "vs/workbench/api/common/extHost.protocol";
import {
	Diagnostic,
	DiagnosticCollection,
	DiagnosticRelatedInformation,
	DiagnosticSeverity,
	DiagnosticTag,
	Uri,
	Location as VscodeLocation,
	Range as VscodeRange,
	// Assuming API objects from 'vscode'
} from "vscode";

import {
	BaseCocoonShim,
	IExtHostRpcService,
	ILogService,
	ProxyIdentifier,
} from "./_baseShim";

// --- Interfaces based on VS Code API and internal usage ---

// For MainThreadDiagnostics RPC proxy
interface MainThreadDiagnosticsShape {
	$changeMany(
		owner: string,
		entries: [IUriComponents, IMarkerData[] | undefined][],
	): Promise<void>;

	$clear(owner: string): Promise<void>;

	// Optional for getDiagnostics
	$getMarkers?(resourceFilter?: IUriComponents): Promise<IMarkerData[]>;

	// $onMarkerChanged event source if onDidChangeDiagnostics is implemented
}

// Structure for IMarkerData (VS Code internal, ensure this matches the protocol)
interface IMarkerData {
	// MarkerSeverity enum value
	severity: number;

	message: string;

	startLineNumber: number;

	startColumn: number;

	endLineNumber: number;

	endColumn: number;

	source?: string;

	code?: string | { value: string; target: IUriComponents };

	relatedInformation?: IRelatedInformation[];

	// MarkerTag enum values
	tags?: number[];
}

interface IRelatedInformation {
	// VS Code internal
	resource: IUriComponents;

	message: string;

	startLineNumber: number;

	startColumn: number;

	endLineNumber: number;

	endColumn: number;
}

// For URI components (used in RPC)
interface IUriComponents {
	// Optional marshalling ID
	$mid?: number;

	scheme: string;

	authority: string;

	path: string;

	query: string;

	fragment: string;

	external?: string;
}

// Type for DiagnosticCollection.set() entries
type DiagnosticEntry = [Uri, Diagnostic[] | undefined | null];

class ShimDiagnosticCollection implements DiagnosticCollection {
	// Name can be undefined
	readonly #name?: string;

	// Unique ID for this collection instance
	readonly #owner: string;

	#proxy: MainThreadDiagnosticsShape | null;

	#logService?: ILogService;

	#isDisposed: boolean = false;

	// Key: uri.toString(), Value: vscode.Diagnostic[]
	#data = new Map<string, Diagnostic[]>();

	constructor(
		name: string | undefined,
		owner: string,
		proxy: MainThreadDiagnosticsShape | null,
		logService?: ILogService,
	) {
		this.#name = name;

		this.#owner = owner;

		this.#proxy = proxy;

		this.#logService = logService;

		this._log(
			`Created ShimDiagnosticCollection: name='${name || "(unnamed)"}', owner='${this.#owner}'`,
		);
	}

	private _log(msg: string, ...args: any[]): void {
		this.#logService?.trace(
			`[DiagnosticCollectionShim][${this.#name || "unnamed"}(${this.#owner})] ${msg}`,
			...args,
		);
	}

	private _logError(msg: string, ...args: any[]): void {
		this.#logService?.error(
			`[DiagnosticCollectionShim][${this.#name || "unnamed"}(${this.#owner})] ${msg}`,
			...args,
		);
	}

	private _logWarn(msg: string, ...args: any[]): void {
		this.#logService?.warn(
			`[DiagnosticCollectionShim][${this.#name || "unnamed"}(${this.#owner})] ${msg}`,
			...args,
		);
	}

	private _validate(): void {
		if (this.#isDisposed) {
			throw new Error("DiagnosticCollection has been disposed");
		}
	}

	get name(): string {
		// VSCode API implies name is string, though constructor allows undefined
		return this.#name || "";
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

		// undefined value signifies deletion
		const toSync = new Map<string, Diagnostic[] | undefined>();

		if (first instanceof Uri) {
			const uri = first;

			const uriStr = uri.toString();

			this._log(`set called for single URI: ${uriStr}`);

			if (
				diagnostics === undefined ||
				diagnostics === null ||
				diagnostics.length === 0
			) {
				if (this.#data.delete(uriStr)) {
					// Mark for clearing
					toSync.set(uriStr, undefined);
				}
			} else {
				// Ensure mutable copy and readonly is handled
				const diagsCopy = [...diagnostics];

				this.#data.set(uriStr, diagsCopy);

				// Mark for update
				toSync.set(uriStr, diagsCopy);
			}
		} else if (Array.isArray(first)) {
			const entries = first;

			this._log(`set called with ${entries.length} URI entries.`);

			for (const [uri, diags] of entries) {
				if (uri instanceof Uri) {
					const uriStr = uri.toString();

					if (
						diags === undefined ||
						diags === null ||
						diags.length === 0
					) {
						if (this.#data.delete(uriStr)) {
							toSync.set(uriStr, undefined);
						}
					} else {
						const diagsCopy = [...diags];

						this.#data.set(uriStr, diagsCopy);

						toSync.set(uriStr, diagsCopy);
					}
				} else {
					this._logWarn(
						`Skipping invalid entry in 'set': URI is not a valid Uri object. Entry:`,
						uri,
					);
				}
			}
		} else {
			this._logError(
				`Invalid arguments passed to DiagnosticCollection.set`,
			);

			return;
		}

		if (toSync.size > 0 && this.#proxy) {
			const entriesForProxy: [
				IUriComponents,
				IMarkerData[] | undefined,
			][] = [];

			for (const [uriStr, diags] of toSync) {
				let markers: IMarkerData[] | undefined = undefined;

				if (diags) {
					// diags is Diagnostic[] here
					try {
						markers = diags.map((d) =>
							this._convertDiagnosticToMarkerData(d),
						);
					} catch (conversionError: any) {
						this._logError(
							`Error converting diagnostics to markers for ${uriStr}: ${conversionError.message || conversionError}`,
						);

						// Skip this URI
						continue;
					}
				}

				try {
					// Parse back to Uri to use _uriToComponents
					const uri = Uri.parse(uriStr);

					const uriComponents = this._uriToComponents(uri);

					if (uriComponents) {
						entriesForProxy.push([uriComponents, markers]);
					} else {
						this._logError(
							`Failed to convert URI string '${uriStr}' to components. Skipping sync.`,
						);
					}
				} catch (e: any) {
					this._logError(
						`Error parsing URI string '${uriStr}' for proxy call: ${e.message || e}. Skipping sync.`,
					);
				}
			}

			if (entriesForProxy.length > 0) {
				this._log(
					`Sending ${entriesForProxy.length} diagnostic change(s) via $changeMany for owner ${this.#owner}.`,
				);

				this.#proxy
					.$changeMany(this.#owner, entriesForProxy)
					.catch((err: any) =>
						this._logError(
							`Error during $changeMany RPC call: ${err.message || err}`,
						),
					);
			}
		}
	}

	public delete(uri: Uri): void {
		this._validate();

		if (!(uri instanceof Uri)) {
			this._logError(`Invalid URI passed to delete:`, uri);

			return;
		}

		const uriStr = uri.toString();

		if (this.#data.delete(uriStr)) {
			this._log(`Deleted diagnostics locally for ${uriStr}`);

			if (this.#proxy) {
				const uriComponents = this._uriToComponents(uri);

				if (uriComponents) {
					this._log(
						`Sending deletion via $changeMany for owner ${this.#owner}, URI: ${uriStr}`,
					);

					this.#proxy
						.$changeMany(this.#owner, [[uriComponents, undefined]])
						.catch((err: any) =>
							this._logError(
								`Error during $changeMany RPC call for delete: ${err.message || err}`,
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
			this._log(
				`Clearing all ${this.#data.size} diagnostic URIs locally for owner ${this.#owner}`,
			);

			this.#data.clear();

			if (this.#proxy) {
				this._log(
					`Sending $clear notification for owner ${this.#owner}`,
				);

				this.#proxy
					.$clear(this.#owner)
					.catch((err: any) =>
						this._logError(
							`Error during $clear RPC call: ${err.message || err}`,
						),
					);
			}
		} else {
			this._log(`clear() called, but collection was already empty.`);
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

		for (const [uriStr, diags] of this.#data) {
			let uri: Uri;

			try {
				uri = Uri.parse(uriStr);
			} catch (e: any) {
				this._logError(
					`Error parsing URI string '${uriStr}' during forEach: ${e.message || e}. Skipping entry.`,
				);

				continue;
			}

			try {
				callback.call(thisArg, uri, Object.freeze([...diags]), this);
			} catch (callbackError: any) {
				this._logError(
					`Error in forEach callback for URI ${uriStr}: ${callbackError.message || callbackError}`,
				);
			}
		}
	}

	public get(uri: Uri): readonly Diagnostic[] | undefined {
		this._validate();

		if (!(uri instanceof Uri)) {
			this._logError(`Invalid URI passed to get:`, uri);

			// Match API: returns undefined if not set, not empty array.
			return Object.freeze([]);
		}

		const diags = this.#data.get(uri.toString());

		return diags ? Object.freeze([...diags]) : undefined;
	}

	public has(uri: Uri): boolean {
		this._validate();

		if (!(uri instanceof Uri)) {
			this._logError(`Invalid URI passed to has:`, uri);

			return false;
		}

		return this.#data.has(uri.toString());
	}

	public dispose(): void {
		if (!this.#isDisposed) {
			this._log(`dispose called for owner ${this.#owner}`);

			this.#isDisposed = true;

			// Send clear notification using the owner ID
			this.clear();

			this.#proxy = null;

			// Release log service
			this.#logService = undefined;

			this.#data.clear();
		}
	}

	// This method is inherited from BaseCocoonShim, but we might need a specific one here if Uri is not handled by the generic one.
	private _uriToComponents(uri: Uri): IUriComponents | undefined {
		// Attempt to use base shim's generic marshaller
		const baseMarshalled = (
			this as any as BaseCocoonShim
		)._convertApiArgToInternal(uri);

		if (
			baseMarshalled &&
			baseMarshalled.$mid === 1 /* MarshalledId.UriSimple */
		) {
			// Check if it was marshalled as UriSimple
			return baseMarshalled as IUriComponents;
		}

		// Fallback for this specific shim if needed, or if base doesn't handle it right
		if (!uri) return undefined;

		if (!(uri instanceof Uri)) {
			this._logError(
				`Attempted to convert non-URI object to components:`,
				uri,
			);

			return undefined;
		}

		try {
			return {
				scheme: uri.scheme,
				authority: uri.authority || "",
				path: uri.path,
				query: uri.query || "",
				fragment: uri.fragment || "",
				// skipEncoding = true
				external: uri.toString(true),
			};
		} catch (e: any) {
			this._logError(
				`Error converting URI to components: ${e.message || e}`,
				uri,
			);

			return undefined;
		}
	}

	private _convertDiagnosticToMarkerData(diag: Diagnostic): IMarkerData {
		const convertSeverity = (sev: DiagnosticSeverity): number => {
			switch (sev) {
				case DiagnosticSeverity.Error:
					// MarkerSeverity.Error
					return 8;

				case DiagnosticSeverity.Warning:
					// MarkerSeverity.Warning
					return 4;

				case DiagnosticSeverity.Information:
					// MarkerSeverity.Info
					return 2;

				case DiagnosticSeverity.Hint:
					// MarkerSeverity.Hint
					return 1;

				default:
					this._logWarn(
						`Unknown DiagnosticSeverity: ${sev}, defaulting to Error.`,
					);

					return 8;
			}
		};

		let markerCode:
			| string
			| { value: string; target: IUriComponents }
			| undefined = undefined;

		if (diag.code !== undefined && diag.code !== null) {
			if (
				typeof diag.code === "object" &&
				diag.code.target instanceof Uri
			) {
				const targetUriComponents = this._uriToComponents(
					diag.code.target,
				);

				if (targetUriComponents) {
					markerCode = {
						value: String(diag.code.value),
						target: targetUriComponents,
					};
				} else {
					this._logWarn(
						`Failed to convert target URI in diagnostic code, using value only. Code:`,
						diag.code,
					);

					markerCode = String(diag.code.value);
				}
			} else if (typeof diag.code === "object") {
				// simple { value: string | number }

				markerCode = String(diag.code.value);
			} else {
				// string or number
				markerCode = String(diag.code);
			}
		}

		const convertRelatedInformation = (
			ri: DiagnosticRelatedInformation,
		): IRelatedInformation | undefined => {
			const resource = this._uriToComponents(ri.location.uri);

			if (!resource) {
				this._logWarn(
					`Failed to convert URI for relatedInformation:`,
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
		};

		const convertTags = (
			tags: readonly DiagnosticTag[],
		): number[] | undefined => {
			if (!tags || tags.length === 0) return undefined;

			return tags
				.map((tag) => {
					// Map vscode.DiagnosticTag to internal MarkerTag values (e.g., 1 for Unnecessary, 2 for Deprecated)
					// This mapping needs to be accurate based on VS Code's internal MarkerTag enum.
					if (tag === DiagnosticTag.Unnecessary) return 1;

					// Assuming 2, verify this
					if (tag === DiagnosticTag.Deprecated) return 2;

					this._logWarn(`Unsupported DiagnosticTag: ${tag}`);

					// Unknown tag
					return 0;
				})
				.filter((t) => t !== 0);
		};

		if (!diag.range) {
			throw new Error(
				`Diagnostic is missing 'range': ${JSON.stringify(diag)}`,
			);
		}

		const range = diag.range;

		return {
			severity: convertSeverity(diag.severity),
			message: diag.message || "",
			startLineNumber: range.start.line + 1,
			startColumn: range.start.character + 1,
			endLineNumber: range.end.line + 1,
			endColumn: range.end.character + 1,
			source: diag.source,
			code: markerCode,
			relatedInformation: diag.relatedInformation
				?.map(convertRelatedInformation)
				.filter((ri) => ri !== undefined) as
				| IRelatedInformation[]
				| undefined,
			tags: diag.tags ? convertTags(diag.tags) : undefined,
		};
	}
}

export class ShimDiagnosticsService extends BaseCocoonShim {
	public readonly _serviceBrand: undefined;

	#mainThreadDiagnosticsProxy: MainThreadDiagnosticsShape | null = null;

	#collectionCounter: number = 0;

	constructor(
		rpcService: IExtHostRpcService | undefined,
		logService: ILogService | undefined,
	) {
		super("ExtHostDiagnostics", rpcService, logService);

		if (this._rpcService) {
			this.#mainThreadDiagnosticsProxy = this._getProxy(
				MainContext.MainThreadDiagnostics as ProxyIdentifier<MainThreadDiagnosticsShape>,
			);
		}

		if (!this.#mainThreadDiagnosticsProxy) {
			this._logError(
				"Failed to get MainThreadDiagnostics proxy! Diagnostic collections will not sync.",
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

		return new ShimDiagnosticCollection(
			name,
			owner,
			this.#mainThreadDiagnosticsProxy,
			this._logService,
		);
	}

	private _createNopCollection(name?: string): DiagnosticCollection {
		this._logWarn(
			`Creating NOP DiagnosticCollection: name='${name || ""}'`,
		);

		const nopMethods = {
			set: () => {},
			delete: () => {},
			clear: () => {},
			forEach: () => {},
			// API returns undefined if not found
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
		this._logWarnOnce(
			"vscode.languages.getDiagnostics is NOT IMPLEMENTED in shim.",
		);

		if (resource && !(resource instanceof Uri)) {
			this._logError(
				"Invalid resource URI passed to getDiagnostics:",
				resource,
			);

			return [];
		}

		// Example if $getMarkers was implemented:
		// if (this.#mainThreadDiagnosticsProxy?.$getMarkers) {

		//     try {

		//         const resourceFilter = resource ? (this as any as BaseCocoonShim)._convertApiArgToInternal(resource) : undefined;

		//         const allMarkers = await this.#mainThreadDiagnosticsProxy.$getMarkers(resourceFilter);

		//         return this._convertMarkersToDiagnostics(allMarkers || []);

		//     } catch (e: any) {

		//         this._logError("Failed to get diagnostics from main thread:", e);

		//         return [];

		//     }

		// }

		return [];
	}

	public get onDidChangeDiagnostics(): VscodeEvent<readonly Uri[]> {
		this._logWarnOnce(
			"vscode.languages.onDidChangeDiagnostics is NOT IMPLEMENTED in shim.",
		);

		return this._createNopEventEmitter() as VscodeEvent<readonly Uri[]>;
	}

	// Helper to convert IMarkerData back to vscode.Diagnostic if getDiagnostics is implemented
	// private _convertMarkersToDiagnostics(markers: IMarkerData[]): Diagnostic[] {

	//     return markers.map(marker => {

	//         const range = new VscodeRange(
	//             marker.startLineNumber - 1,
	//             marker.startColumn - 1,
	//             marker.endLineNumber - 1,
	//             marker.endColumn - 1
	//         );

	// Simplified severity conversion, need MarkerSeverity enum values from VS Code
	//
	//         let severity: DiagnosticSeverity;

	//         if (marker.severity === 8) severity = DiagnosticSeverity.Error;

	//         else if (marker.severity === 4) severity = DiagnosticSeverity.Warning;

	//         else if (marker.severity === 2) severity = DiagnosticSeverity.Information;

	//         else if (marker.severity === 1) severity = DiagnosticSeverity.Hint;

	// Default
	//         else severity = DiagnosticSeverity.Error;

	//         const diag = new Diagnostic(range, marker.message, severity);

	//         diag.source = marker.source;

	//         if (typeof marker.code === 'string') {

	//             diag.code = marker.code;

	//         } else if (marker.code && typeof marker.code === 'object') {

	//             const targetUri = (this as any as BaseCocoonShim)._reviveApiArgument<Uri>(marker.code.target);

	//             if (targetUri) {

	//                diag.code = { value: marker.code.value, target: targetUri };

	//             } else {

	//                diag.code = marker.code.value;

	//             }

	//         }

	// TODO: Convert relatedInformation and tags
	//
	//         return diag;

	//     });

	// }
}

// Original export style
// export { ShimDiagnosticsService };

// Class is already exported by `export class ...`
