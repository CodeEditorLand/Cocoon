/*---------------------------------------------------------------------------------------------
 * Cocoon Diagnostics Shim 
 * --------------------------------------------------------------------------------------------
 * Implements `vscode.languages.createDiagnosticCollection` and related diagnostics APIs,
 * fulfilling `IExtHostDiagnostics` (though not explicitly defined as an interface here)
 * and the RPC shape `ExtHostDiagnosticsRpcShape`.
 *
 * - `ShimDiagnosticsService`:
 *   - Factory for `DiagnosticCollection` instances.
 *   - Proxies `getDiagnostics(resource?)` to Mountain via RPC (`$getDiagnostics`).
 *   - Fires `onDidChangeDiagnostics` based on Mountain's `$acceptMarkersChange` RPC.
 * - `ShimDiagnosticCollectionImpl` (implements `vscode.DiagnosticCollection`):
 *   - Manages diagnostics for a specific owner.
 *   - Converts `vscode.Diagnostic` API objects to `extHostProtocol.IMarkerData` DTOs
 *     using `TypeConverters.DiagnosticConverter` for RPC.
 *   - Sends diagnostic changes to Mountain via RPC (`$changeMany`, `$clear`).
 *
 * Key Interactions:
 * - `ShimDiagnosticsService` typically registered with DI.
 * - `vscode.languages.createDiagnosticCollection` delegates to this service.
 * - RPC communication with `MainContext.MainThreadDiagnostics` on Mountain.
 * - Uses `BaseCocoonShim`.
 * - Relies on `TypeConverters.DiagnosticConverter` for DTO conversions.
 * - Uses `IURITransformer` for URI marshalling/unmarshalling if provided.
 *
 * Last Reviewed/Updated: [Date of Merge or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
import {
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
import type { IURITransformer } from "vs/base/common/uriIpc";
// MarkerSeverity and MarkerTag are imported from platform/markers by TypeConverters if needed.
// Here we mostly deal with vscode.DiagnosticSeverity/Tag on API side and extHostProtocol.IMarkerData on DTO side.
import {
	ExtHostContext,
	MainContext,
	type IMarkerData as ExtHostProtocolMarkerData, // Renaming for clarity vs. ILocalMarkerData
} from "vs/workbench/api/common/extHost.protocol";
import {
	Diagnostic,
	DiagnosticSeverity, // API Enum
	DiagnosticTag, // API Enum
	Location as VscodeLocation, // API Type
	Range as VscodeRange, // API Type
	Uri as VscodeUri, // API Type
	type DiagnosticCollection,
	type DiagnosticRelatedInformation as VscodeDiagnosticRelatedInformation, // API Type
} from "vscode";

import * as TypeConverters from "../cocoon-type-converters";
import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- RPC Interface Definitions  ---

/** Defines the RPC interface for the `MainThreadDiagnostics` service. */
interface MainThreadDiagnosticsShape {
	$changeMany(
		owner: string,
		entries: [
			VSCodeInternalUriComponents,
			ExtHostProtocolMarkerData[] | undefined,
		][],
	): Promise<void>; // Protocol $changeMany is void, not Promise<void> - using Promise for async pattern.
	$clear(owner: string): Promise<void>; // Protocol $clear is void.
	$getDiagnostics(
		resourceFilter?: VSCodeInternalUriComponents,
	): Promise<ExtHostProtocolMarkerData[]>; // Protocol is IMarkerData[]
}

/** Defines the RPC interface for this `ExtHostDiagnostics` service, for methods called BY Mountain. */
interface ExtHostDiagnosticsRpcShape {
	// VS Code uses $acceptMarkersChange with entries array (protocol has IMarkerData[], not undefined)
	$acceptMarkersChange(
		entries: [
			VSCodeInternalUriComponents,
			ExtHostProtocolMarkerData[] /* | undefined - This was local, protocol is strict IMarkerData[] */,
		][],
	): void;
}

/** Represents the tuple structure for `DiagnosticCollection.set` entries. */
type DiagnosticEntryTuple = [
	VscodeUri,
	readonly Diagnostic[] | undefined | null,
];

/** Cocoon's implementation of `vscode.DiagnosticCollection`. */
class ShimDiagnosticCollectionImpl implements DiagnosticCollection {
	readonly #collectionName?: string;
	readonly #ownerId: string;
	#mainThreadDiagnosticsProxy: MainThreadDiagnosticsShape | null;
	#logService?: ILogServiceForShim;
	#isDisposed = false;
	readonly #diagnosticsCache = new Map<string, Diagnostic[]>(); // Key: uri.toString()
	readonly #uriTransformer?: IURITransformer;

	constructor(
		name: string | undefined,
		ownerId: string,
		proxy: MainThreadDiagnosticsShape | null,
		logService: ILogServiceForShim | undefined,
		uriTransformer?: IURITransformer,
	) {
		this.#collectionName = name;
		this.#ownerId = ownerId;
		this.#mainThreadDiagnosticsProxy = proxy;
		this.#logService = logService;
		this.#uriTransformer = uriTransformer;
		this._logImplTrace(
			`Created collection. Name='${name || "(unnamed)"}', OwnerID='${this.#ownerId}'`,
		);
	}

	private _logImplTrace(message: string, ...args: any[]): void {
		this.#logService?.trace(
			`[DiagCol][${this.#collectionName || this.#ownerId}] ${message}`,
			...args,
		);
	}
	private _logImplError(message: string | Error, ...args: any[]): void {
		const prefix = `[DiagCol][${this.#collectionName || this.#ownerId}]`;
		if (this.#logService) {
			this.#logService.error(
				message instanceof Error ? message : `${prefix} ${message}`,
				...args,
			);
		} else {
			console.error(
				`${prefix} ${message instanceof Error ? message.message : message}`,
				...args,
				message instanceof Error ? message.stack : "",
			);
		}
	}
	private _logImplWarn(message: string, ...args: any[]): void {
		this.#logService?.warn(
			`[DiagCol][${this.#collectionName || this.#ownerId}] ${message}`,
			...args,
		);
	}
	private _validateNotDisposed(): void {
		if (this.#isDisposed) {
			throw new Error(
				`DiagnosticCollection '${this.#collectionName || this.#ownerId}' has been disposed.`,
			);
		}
	}

	get name(): string {
		return this.#collectionName || "";
	}

	public set(
		uri: VscodeUri,
		diagnostics: readonly Diagnostic[] | undefined | null,
	): void;
	public set(entries: readonly DiagnosticEntryTuple[]): void;
	public set(
		firstParam: VscodeUri | readonly DiagnosticEntryTuple[],
		diagnosticsOrUndefined?: readonly Diagnostic[] | undefined | null,
	): void {
		this._validateNotDisposed();
		const entriesToSync = new Map<
			string,
			ExtHostProtocolMarkerData[] | undefined
		>();

		const processEntry = (
			uri: VscodeUri,
			diags: readonly Diagnostic[] | undefined | null,
		): void => {
			if (!(uri instanceof VscodeUri)) {
				this._logImplWarn(
					"Skipping invalid URI in DiagnosticCollection.set(); URI must be an instance of vscode.Uri.",
					uri,
				);
				return;
			}
			const uriString = uri.toString();
			if (diags === undefined || diags === null || diags.length === 0) {
				if (this.#diagnosticsCache.delete(uriString)) {
					entriesToSync.set(uriString, undefined); // undefined means clear markers for this URI
				}
			} else {
				const newDiags = [...diags]; // Ensure it's a mutable array for cache
				this.#diagnosticsCache.set(uriString, newDiags);
				try {
					const markerDataArray =
						TypeConverters.DiagnosticConverter.fromApiArray(
							newDiags,
							this.#uriTransformer,
						);
					entriesToSync.set(uriString, markerDataArray);
				} catch (conversionError: any) {
					this._logImplError(
						`Error converting diagnostics to DTOs for URI '${uriString}'. Diagnostics not synced.`,
						conversionError,
					);
				}
			}
		};

		if (firstParam instanceof VscodeUri)
			processEntry(firstParam, diagnosticsOrUndefined);
		else if (Array.isArray(firstParam))
			firstParam.forEach(([uri, diags]) => processEntry(uri, diags));
		else {
			this._logImplError(
				"Invalid arguments to DiagnosticCollection.set().",
			);
			return;
		}

		if (entriesToSync.size > 0 && this.#mainThreadDiagnosticsProxy) {
			const rpcEntries: [
				VSCodeInternalUriComponents,
				ExtHostProtocolMarkerData[] | undefined,
			][] = [];
			for (const [uriStr, markerDataArray] of entriesToSync) {
				try {
					const uriForMarshalling = VscodeUri.parse(uriStr, true); // URI from string key
					const uriDto = this.#uriTransformer
						? this.#uriTransformer.transformOutgoing(
								uriForMarshalling,
							)
						: uriForMarshalling.toJSON();

					if (uriDto) rpcEntries.push([uriDto, markerDataArray]);
					else
						this._logImplError(
							`Failed to marshal URI '${uriStr}' for RPC sync. Skipping.`,
						);
				} catch (e: any) {
					this._logImplError(
						`Error preparing URI '${uriStr}' for RPC sync: ${e.message}. Skipping.`,
					);
				}
			}
			if (rpcEntries.length > 0) {
				this._logImplTrace(
					`Sending ${rpcEntries.length} diagnostic change(s) to MainThread via $changeMany.`,
				);
				this.#mainThreadDiagnosticsProxy
					.$changeMany(this.#ownerId, rpcEntries)
					.catch((err) =>
						this._logImplError(
							`RPC $changeMany failed:`,
							refineErrorForShim(
								err,
								this.#logService,
								"$changeMany RPC",
							),
						),
					);
			}
		}
	}

	public delete(uri: VscodeUri): void {
		this._validateNotDisposed();
		if (!(uri instanceof VscodeUri)) {
			this._logImplError(
				"Invalid URI in DiagnosticCollection.delete(); must be vscode.Uri.",
				uri,
			);
			return;
		}
		const uriString = uri.toString();
		if (this.#diagnosticsCache.delete(uriString)) {
			this._logImplTrace(
				`Deleted diagnostics locally for URI: ${uriString}`,
			);
			if (this.#mainThreadDiagnosticsProxy) {
				const uriDto = this.#uriTransformer
					? this.#uriTransformer.transformOutgoing(uri)
					: uri.toJSON();
				if (uriDto) {
					this.#mainThreadDiagnosticsProxy
						.$changeMany(this.#ownerId, [[uriDto, undefined]]) // Send undefined markers to clear
						.catch((err) =>
							this._logImplError(
								`RPC $changeMany (for delete) on URI '${uriString}' failed:`,
								refineErrorForShim(
									err,
									this.#logService,
									"delete RPC",
								),
							),
						);
				} else {
					this._logImplError(
						`Failed to marshal URI '${uriString}' for delete RPC. MainThread diagnostics may persist.`,
					);
				}
			}
		}
	}

	public clear(): void {
		this._validateNotDisposed();
		if (this.#diagnosticsCache.size > 0) {
			this._logImplTrace(
				`Clearing all ${this.#diagnosticsCache.size} URIs locally.`,
			);
			this.#diagnosticsCache.clear();
			if (this.#mainThreadDiagnosticsProxy) {
				this.#mainThreadDiagnosticsProxy
					.$clear(this.#ownerId)
					.catch((err) =>
						this._logImplError(
							`RPC $clear call failed:`,
							refineErrorForShim(
								err,
								this.#logService,
								"clear RPC",
							),
						),
					);
			}
		}
	}

	public forEach(
		callback: (
			uri: VscodeUri,
			diagnostics: readonly Diagnostic[],
			collection: DiagnosticCollection,
		) => any,
		thisArg?: any,
	): void {
		this._validateNotDisposed();
		this.#diagnosticsCache.forEach((diagnosticsArray, uriString) => {
			let uriInstance: VscodeUri;
			try {
				uriInstance = VscodeUri.parse(uriString, true);
			} catch (e: any) {
				this._logImplError(
					`Error parsing cached URI string '${uriString}' in forEach. Skipping entry.`,
					e,
				);
				return;
			}
			try {
				callback.call(
					thisArg,
					uriInstance,
					Object.freeze([...diagnosticsArray]),
					this,
				);
			} catch (e: any) {
				this._logImplError(
					`Error in DiagnosticCollection.forEach callback for URI ${uriString}:`,
					e,
				);
			}
		});
	}

	public get(uri: VscodeUri): readonly Diagnostic[] | undefined {
		this._validateNotDisposed();
		if (!(uri instanceof VscodeUri)) {
			this._logImplError(
				"Invalid URI in DiagnosticCollection.get(); must be vscode.Uri.",
				uri,
			);
			return undefined;
		}
		const diagnosticsArray = this.#diagnosticsCache.get(uri.toString());
		return diagnosticsArray
			? Object.freeze([...diagnosticsArray])
			: undefined;
	}

	public has(uri: VscodeUri): boolean {
		this._validateNotDisposed();
		if (!(uri instanceof VscodeUri)) {
			this._logImplError(
				"Invalid URI in DiagnosticCollection.has(); must be vscode.Uri.",
				uri,
			);
			return false;
		}
		return this.#diagnosticsCache.has(uri.toString());
	}

	public dispose(): void {
		if (!this.#isDisposed) {
			this._logImplTrace(`dispose() called. Clearing diagnostics.`);
			this.#isDisposed = true;
			this.clear(); // This will also send $clear to main thread if proxy exists
			this.#mainThreadDiagnosticsProxy = null; // Prevent further RPCs
			this.#logService = undefined; // Release log service ref
			// diagnosticsCache is cleared by this.clear()
		}
	}
}

/** Cocoon's implementation of `IExtHostDiagnostics`. */
export class ShimDiagnosticsService
	extends BaseCocoonShim
	implements ExtHostDiagnosticsRpcShape
{
	public readonly _serviceBrand: undefined;
	#mainThreadDiagnosticsProxy: MainThreadDiagnosticsShape | null = null;
	#collectionOwnerCounter = 0;
	readonly #onDidChangeDiagnosticsEmitter = this._instanceDisposables.add(
		new VscodeEmitter<readonly VscodeUri[]>(),
	);
	public readonly onDidChangeDiagnostics: VscodeEvent<readonly VscodeUri[]> =
		this.#onDidChangeDiagnosticsEmitter.event;
	#uriTransformer?: IURITransformer;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
		uriTransformer?: IURITransformer,
	) {
		super("ExtHostDiagnostics", rpcService, logService);
		this.#uriTransformer = uriTransformer;
		this._logInfo("Initialized.");
		if (this._rpcService) {
			this.#mainThreadDiagnosticsProxy = this._getProxy(
				MainContext.MainThreadDiagnostics as ProxyIdentifier<MainThreadDiagnosticsShape>,
			);
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostDiagnostics as ProxyIdentifier<ExtHostDiagnosticsRpcShape>,
					this,
				);
				this._logInfo(
					"Registered self for RPC calls from MainThread (ExtHostDiagnostics).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to register self as RPC target for ExtHostDiagnostics:",
					e,
				);
			}
		}
		if (!this.#mainThreadDiagnosticsProxy) {
			this._logError(
				"Failed to obtain MainThreadDiagnostics RPC proxy. Diagnostics will not function correctly.",
			);
		}
	}

	public createDiagnosticCollection(name?: string): DiagnosticCollection {
		this._logTrace(
			`API createDiagnosticCollection called: Name='${name || "(unnamed)"}'`,
		);
		if (!this.#mainThreadDiagnosticsProxy) {
			this._logError(
				`Cannot create DiagCol '${name}': MainThread proxy unavailable. Returning NOP collection.`,
			);
			return this._createNopDiagnosticCollection(name);
		}
		const ownerId = `cocoon_diag_owner_${this.#collectionOwnerCounter++}_${name || "anon"}`;
		return new ShimDiagnosticCollectionImpl(
			name,
			ownerId,
			this.#mainThreadDiagnosticsProxy,
			this._logService,
			this.#uriTransformer,
		);
	}

	private _createNopDiagnosticCollection(
		name?: string,
	): DiagnosticCollection {
		this._logWarn(
			`Creating NOP DiagnosticCollection: Name='${name || "(unnamed)"}' due to unavailable RPC proxy.`,
		);
		// Ensure all methods are present as per vscode.DiagnosticCollection
		return Object.freeze({
			name: name || "",
			set: () => {},
			delete: () => {},
			clear: () => {},
			forEach: () => {},
			get: () => undefined,
			has: () => false,
			dispose: () => {},
		}) as DiagnosticCollection;
	}

	public async getDiagnostics(
		resource?: VscodeUri,
	): Promise<readonly Diagnostic[]> {
		const resourceForLog = resource
			? resource.toString()
			: "(all resources)";
		this._logTrace(
			`API getDiagnostics called for resource: ${resourceForLog}`,
		);
		if (!this.#mainThreadDiagnosticsProxy?.$getDiagnostics) {
			this._logError(
				"Cannot getDiagnostics: MainThread proxy or $getDiagnostics method unavailable. Returning empty array.",
			);
			return Object.freeze([]);
		}
		try {
			const resourceFilterDto = resource
				? this.#uriTransformer
					? this.#uriTransformer.transformOutgoing(resource)
					: resource.toJSON()
				: undefined;
			const markersDataArray =
				await this.#mainThreadDiagnosticsProxy.$getDiagnostics(
					resourceFilterDto,
				);
			return Object.freeze(
				TypeConverters.DiagnosticConverter.toApiArray(
					markersDataArray || [],
					this.#uriTransformer,
				),
			);
		} catch (e: any) {
			this._logError(
				"Failed to get diagnostics via RPC $getDiagnostics:",
				refineErrorForShim(e, this._logService, "getDiagnostics RPC"),
			);
			return Object.freeze([]);
		}
	}

	public $acceptMarkersChange(
		entries: [
			VSCodeInternalUriComponents,
			ExtHostProtocolMarkerData[] /* | undefined removed */,
		][],
	): void {
		const changedUriCount = entries.length;
		this._logTrace(
			`RPC $acceptMarkersChange received for ${changedUriCount} URIs.`,
		);
		const changedVscodeUris: VscodeUri[] = [];
		for (const [uriComp /*, _markers*/] of entries) {
			// _markers are not used here, only the URI
			try {
				// Revive URI using VSCodeInternalURI.revive and the transformer
				const revivedUri = VSCodeInternalURI.revive(
					this.#uriTransformer
						? this.#uriTransformer.transformIncoming(uriComp)
						: uriComp,
				);
				// Ensure it's an instance of our VscodeUri API type for the event
				// This assumes VSCodeInternalURI can be cast or is compatible with VscodeUri (which it should be via 'vscode' module aliasing)
				if (
					revivedUri instanceof VscodeUri ||
					revivedUri instanceof VSCodeInternalURI
				) {
					changedVscodeUris.push(revivedUri as VscodeUri);
				} else {
					this._logWarn(
						"$acceptMarkersChange: Failed to revive URI component from MainThread to a valid vscode.Uri.",
						uriComp,
					);
				}
			} catch (e: any) {
				this._logError(
					"$acceptMarkersChange: Error reviving URI component.",
					uriComp,
					e,
				);
			}
		}
		if (changedVscodeUris.length > 0) {
			this.#onDidChangeDiagnosticsEmitter.fire(
				Object.freeze(changedVscodeUris),
			);
			this._logTrace(
				`Fired onDidChangeDiagnostics event for ${changedVscodeUris.length} URIs.`,
			);
		}
	}

	public override dispose(): void {
		super.dispose();
		this._logInfo("Disposed.");
	}
}
