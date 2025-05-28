/*---------------------------------------------------------------------------------------------
 * Cocoon Diagnostics Shim (diagnostics-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements `vscode.languages.createDiagnosticCollection` and related diagnostics APIs,
 *
 *
 * fulfilling `IExtHostDiagnostics` and the RPC shape `ExtHostDiagnosticsRpcShape`.
 *
 * - `ShimDiagnosticsService`:
 *   - Factory for `DiagnosticCollection` instances.
 *   - Proxies `getDiagnostics(resource?)` to Mountain via RPC (`$getMany`).
 *   - Fires `onDidChangeDiagnostics` based on Mountain's `$acceptMarkersChange` RPC.
 * - `ShimDiagnosticCollectionImpl` (implements `vscode.DiagnosticCollection`):
 *   - Manages diagnostics for a specific owner.
 *   - Converts `vscode.Diagnostic` API objects to `ILocalMarkerData` DTOs for RPC
 *     (TODO: fully delegate to centralized `CocoonTypeConverters`).
 *   - Sends diagnostic changes to Mountain via RPC (`$changeMany`, `$clear`).
 *
 * Key Interactions:
 * - `ShimDiagnosticsService` registered with DI as `IExtHostDiagnostics`.
 * - `vscode.languages.createDiagnosticCollection` delegates to this service.
 * - RPC communication with `MainContext.MainThreadDiagnostics` on Mountain.
 * - Uses `BaseCocoonShim`.
 * - TODO: Replace all `_TMP_convert...` methods with centralized `CocoonTypeConverters`.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
import {
	URI as VSCodeInternalURI, // For creating VscodeApiUri from revived DTOs in _TMP_convert
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
import {
	MarkerSeverity as VscodeInternalMarkerSeverity,
	MarkerTag as VscodeInternalMarkerTag,
	type IMarkerData as VscodeInternalIMarkerData, // DTO target for MainThread
} from "vs/platform/markers/common/markers";
import {
	ExtHostContext,
	MainContext,
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

// Assuming resolved to API shim

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Local DTO and Enum Definitions (Matching protocol/internal types) ---
type ILocalUriComponents = VSCodeInternalUriComponents; // DTO for URIs
type ILocalMarkerData = VscodeInternalIMarkerData; // DTO for individual diagnostics sent to/from MainThread

/** Defines the RPC interface for the `MainThreadDiagnostics` service. */
interface MainThreadDiagnosticsShape {
	$changeMany(
		owner: string,
		entries: [ILocalUriComponents, ILocalMarkerData[] | undefined][],
	): Promise<void>;
	$clear(owner: string): Promise<void>;
	// VS Code protocol uses $getDiagnostics, not $getMany usually.
	$getDiagnostics(
		resourceFilter?: ILocalUriComponents,
	): Promise<ILocalMarkerData[]>;
}

/** Defines the RPC interface for this `ExtHostDiagnostics` service, for methods called BY Mountain. */
interface ExtHostDiagnosticsRpcShape {
	$acceptMarkersChange(
		entries: [ILocalUriComponents, ILocalMarkerData[] | undefined][],
	): void;
}

/** Represents the tuple structure for `DiagnosticCollection.set` entries. */
type DiagnosticEntryTuple = [
	VscodeUri,
	readonly Diagnostic[] | undefined | null,
];

// Temporary type converters - TODO: Move to a central cocoon-type-converters.ts
const _TMP_convertDiagnosticTagToMarkerTag = (
	tag: DiagnosticTag,
): VscodeInternalMarkerTag | undefined => {
	switch (tag) {
		case DiagnosticTag.Unnecessary:
			return VscodeInternalMarkerTag.Unnecessary;
		case DiagnosticTag.Deprecated:
			return VscodeInternalMarkerTag.Deprecated;
		default:
			return undefined; // Or log a warning for unknown tags
	}
};
const _TMP_convertMarkerTagToDiagnosticTag = (
	tag: VscodeInternalMarkerTag,
): DiagnosticTag | undefined => {
	switch (tag) {
		case VscodeInternalMarkerTag.Unnecessary:
			return DiagnosticTag.Unnecessary;
		case VscodeInternalMarkerTag.Deprecated:
			return DiagnosticTag.Deprecated;
		default:
			return undefined;
	}
};
// End Temporary type converters

/** Cocoon's implementation of `vscode.DiagnosticCollection`. */
class ShimDiagnosticCollectionImpl implements DiagnosticCollection {
	readonly #collectionName?: string;
	readonly #ownerId: string; // Unique ID for this collection on MainThread
	#mainThreadDiagnosticsProxy: MainThreadDiagnosticsShape | null;
	#logService?: ILogServiceForShim;
	#isDisposed = false;
	readonly #diagnosticsCache = new Map<string, Diagnostic[]>(); // Key: uri.toString()
	readonly #uriMarshaller: (
		uri: VscodeUri,
	) => ILocalUriComponents | undefined;
	readonly #uriReviverForCodeTarget: (
		dto: ILocalUriComponents,
	) => VscodeUri | undefined; // For relatedInfo and code.target

	constructor(
		name: string | undefined,
		ownerId: string,
		proxy: MainThreadDiagnosticsShape | null,
		logService: ILogServiceForShim | undefined,
		uriMarshaller: (uri: VscodeUri) => ILocalUriComponents | undefined,
		uriReviverForCodeTarget: (
			dto: ILocalUriComponents,
		) => VscodeUri | undefined,
	) {
		this.#collectionName = name;
		this.#ownerId = ownerId;
		this.#mainThreadDiagnosticsProxy = proxy;
		this.#logService = logService;
		this.#uriMarshaller = uriMarshaller;
		this.#uriReviverForCodeTarget = uriReviverForCodeTarget;
		this._logImplDebug(
			`Created collection. Name='${name || "(unnamed)"}', OwnerID='${this.#ownerId}'`,
		);
	}

	private _logImplDebug(message: string, ...args: any[]): void {
		this.#logService?.debug(
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
		const entriesToSync = new Map<string, ILocalMarkerData[] | undefined>();

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
					entriesToSync.set(uriString, undefined);
				} // undefined DTO means clear
			} else {
				const newDiags = [...diags]; // Store a copy
				this.#diagnosticsCache.set(uriString, newDiags);
				try {
					// TODO: Replace with CocoonTypeConverters.Diagnostic.fromApiArray when available
					const markerDataArray = newDiags.map((d) =>
						this._TMP_convertDiagnosticToMarkerData(d),
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
				ILocalUriComponents,
				ILocalMarkerData[] | undefined,
			][] = [];
			for (const [uriStr, markerDataArray] of entriesToSync) {
				try {
					const uriForMarshalling = VscodeUri.parse(uriStr, true); // Ensure it's an API URI instance
					const uriDto = this.#uriMarshaller(uriForMarshalling);
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
				this._logImplDebug(
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
			this._logImplDebug(
				`Deleted diagnostics locally for URI: ${uriString}`,
			);
			if (this.#mainThreadDiagnosticsProxy) {
				const uriDto = this.#uriMarshaller(uri);
				if (uriDto) {
					this.#mainThreadDiagnosticsProxy
						.$changeMany(this.#ownerId, [[uriDto, undefined]]) // undefined markers means clear
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
			this._logImplDebug(
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
			try {
				callback.call(
					thisArg,
					VscodeUri.parse(uriString, true),
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
			this._logImplDebug(`dispose() called. Clearing diagnostics.`);
			this.#isDisposed = true;
			this.clear(); // This will also attempt to clear on MainThread
			this.#mainThreadDiagnosticsProxy = null; // Release proxy
			this.#logService = undefined; // Release logger
		}
	}

	// TEMPORARY - TODO: Replace with CocoonTypeConverters.Diagnostic.fromApi
	private _TMP_convertDiagnosticToMarkerData(
		diag: Diagnostic,
	): ILocalMarkerData {
		const severityMap: {
			[key in DiagnosticSeverity]: VscodeInternalMarkerSeverity;
		} = {
			[DiagnosticSeverity.Error]: VscodeInternalMarkerSeverity.Error,
			[DiagnosticSeverity.Warning]: VscodeInternalMarkerSeverity.Warning,
			[DiagnosticSeverity.Information]: VscodeInternalMarkerSeverity.Info,
			[DiagnosticSeverity.Hint]: VscodeInternalMarkerSeverity.Hint,
		};
		const codeDto =
			typeof diag.code === "object" && diag.code !== null
				? {
						value: String(diag.code.value),
						target: this.#uriMarshaller(
							diag.code.target as VscodeUri,
						)!,
					} // Assuming target is VscodeUri
				: diag.code !== undefined
					? String(diag.code)
					: undefined;

		// TODO: Implement proper conversion for diag.relatedInformation
		const relatedInformationDto = diag.relatedInformation?.map((info) => ({
			resource: this.#uriMarshaller(info.location.uri)!,
			message: info.message,
			startLineNumber: info.location.range.start.line + 1,
			startColumn: info.location.range.start.character + 1,
			endLineNumber: info.location.range.end.line + 1,
			endColumn: info.location.range.end.character + 1,
		}));

		return {
			message: diag.message,
			severity:
				severityMap[diag.severity] ??
				VscodeInternalMarkerSeverity.Error,
			startLineNumber: diag.range.start.line + 1, // API is 0-based, DTO is 1-based for lines/cols
			startColumn: diag.range.start.character + 1,
			endLineNumber: diag.range.end.line + 1,
			endColumn: diag.range.end.character + 1,
			source: diag.source,
			code: codeDto as VscodeInternalIMarkerData["code"], // Cast after conversion
			tags: diag.tags
				?.map(_TMP_convertDiagnosticTagToMarkerTag)
				.filter((t) => t !== undefined) as
				| VscodeInternalMarkerTag[]
				| undefined,
			relatedInformation: relatedInformationDto,
		} as ILocalMarkerData; // Cast to ensure all fields match, even if some are complex DTOs
	}
}

/** Cocoon's implementation of `IExtHostDiagnostics`. */
export class ShimDiagnosticsService
	extends BaseCocoonShim
	implements ExtHostDiagnosticsRpcShape
{
	public readonly _serviceBrand: undefined; // For IExtHostDiagnostics DI
	#mainThreadDiagnosticsProxy: MainThreadDiagnosticsShape | null = null;
	#collectionOwnerCounter = 0;
	readonly #onDidChangeDiagnosticsEmitter = this._instanceDisposables.add(
		new VscodeEmitter<readonly VscodeUri[]>(),
	);
	public readonly onDidChangeDiagnostics: VscodeEvent<readonly VscodeUri[]> =
		this.#onDidChangeDiagnosticsEmitter.event;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostDiagnostics", rpcService, logService);
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
		this._logDebug(
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
			(uri: VscodeUri) =>
				this._convertApiArgToInternal(uri) as
					| ILocalUriComponents
					| undefined,
			(dto: ILocalUriComponents) =>
				this._reviveApiArgument<VscodeUri>(dto), // For reviving code.target URI DTOs
		);
	}

	private _createNopDiagnosticCollection(
		name?: string,
	): DiagnosticCollection {
		this._logWarn(
			`Creating NOP DiagnosticCollection: Name='${name || "(unnamed)"}' due to unavailable RPC proxy.`,
		);
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
		this._logDebug(
			`API getDiagnostics called for resource: ${resourceForLog}`,
		);
		if (!this.#mainThreadDiagnosticsProxy?.$getDiagnostics) {
			// VS Code uses $getDiagnostics
			this._logError(
				"Cannot getDiagnostics: MainThread proxy or $getDiagnostics method unavailable. Returning empty array.",
			);
			return Object.freeze([]);
		}
		try {
			const resourceFilterDto = resource
				? (this._convertApiArgToInternal(
						resource,
					) as ILocalUriComponents)
				: undefined;
			const markersDataArray =
				await this.#mainThreadDiagnosticsProxy.$getDiagnostics(
					resourceFilterDto,
				);
			// TODO: Replace with CocoonTypeConverters.Diagnostic.toApiArray when available
			return Object.freeze(
				this._TMP_convertMarkersArrayToDiagnosticsArray(
					markersDataArray || [],
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

	// RPC Method from MainThread (ExtHostDiagnosticsRpcShape)
	// Renamed from $acceptDiagnosticsChanged to align with VS Code protocol
	public $acceptMarkersChange(
		entries: [ILocalUriComponents, ILocalMarkerData[] | undefined][],
	): void {
		const changedUriCount = entries.length;
		this._logDebug(
			`RPC $acceptMarkersChange received for ${changedUriCount} URIs.`,
		);
		const changedVscodeUris: VscodeUri[] = [];
		for (const [uriComp /*_markers*/] of entries) {
			// _markers not used directly for event firing payload
			try {
				const revivedUri = this._reviveApiArgument<VscodeUri>(uriComp); // BaseCocoonShim handles URI revival
				if (revivedUri instanceof VscodeUri) {
					changedVscodeUris.push(revivedUri);
				} else {
					this._logWarn(
						"$acceptMarkersChange: Failed to revive URI component from MainThread.",
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
			this._logDebug(
				`Fired onDidChangeDiagnostics event for ${changedVscodeUris.length} URIs.`,
			);
		}
	}

	// TEMPORARY - TODO: Replace with CocoonTypeConverters.Diagnostic.toApiArray
	private _TMP_convertMarkersArrayToDiagnosticsArray(
		markersDataArray: ILocalMarkerData[],
	): Diagnostic[] {
		return markersDataArray.map((markerData) => {
			const severityMap: {
				[key in VscodeInternalMarkerSeverity]?: DiagnosticSeverity;
			} = {
				[VscodeInternalMarkerSeverity.Error]: DiagnosticSeverity.Error,
				[VscodeInternalMarkerSeverity.Warning]:
					DiagnosticSeverity.Warning,
				[VscodeInternalMarkerSeverity.Info]:
					DiagnosticSeverity.Information,
				[VscodeInternalMarkerSeverity.Hint]: DiagnosticSeverity.Hint,
			};
			const severity =
				severityMap[markerData.severity] ?? DiagnosticSeverity.Error;
			const diagnosticRange = new VscodeRange(
				markerData.startLineNumber - 1,
				markerData.startColumn - 1, // DTO is 1-based, API is 0-based
				markerData.endLineNumber - 1,
				markerData.endColumn - 1,
			);
			const diagnostic = new Diagnostic(
				diagnosticRange,
				markerData.message || "",
				severity,
			);
			if (markerData.source) diagnostic.source = markerData.source;
			if (typeof markerData.code === "string")
				diagnostic.code = markerData.code;
			else if (markerData.code && typeof markerData.code === "object") {
				const targetUri = markerData.code.target
					? this._reviveApiArgument<VscodeUri>(markerData.code.target)
					: undefined;
				if (targetUri) {
					// Only set if targetUri is valid
					diagnostic.code = {
						value: String(markerData.code.value),
						target: targetUri,
					};
				} else {
					diagnostic.code = String(markerData.code.value); // Fallback to just value if target URI is bad
				}
			}
			// TODO: Full revival of relatedInformation and tags
			if (markerData.relatedInformation) {
				diagnostic.relatedInformation =
					markerData.relatedInformation.map(
						(info) =>
							new VscodeDiagnosticRelatedInformation(
								new VscodeLocation(
									this._reviveApiArgument<VscodeUri>(
										info.resource,
									)!, // Assume revive works
									new VscodeRange(
										info.startLineNumber - 1,
										info.startColumn - 1,
										info.endLineNumber - 1,
										info.endColumn - 1,
									),
								),
								info.message,
							),
					);
			}
			if (markerData.tags) {
				diagnostic.tags = markerData.tags
					.map(_TMP_convertMarkerTagToDiagnosticTag)
					.filter((t) => t !== undefined) as DiagnosticTag[];
			}
			return diagnostic;
		});
	}

	public override dispose(): void {
		super.dispose(); // Base class handles _onDidChangeDiagnosticsEmitter via _instanceDisposables
		this._logInfo("Disposed.");
	}
}
