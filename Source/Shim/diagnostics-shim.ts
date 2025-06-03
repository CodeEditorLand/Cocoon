/*---------------------------------------------------------------------------------------------
 * Cocoon Diagnostics Shim (diagnostics-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements `vscode.languages.createDiagnosticCollection` and related diagnostics APIs,
 * fulfilling `IExtHostDiagnostics` and the RPC shape `ExtHostDiagnosticsRpcShape`.
 *
 * - `ShimDiagnosticsService`:
 *   - Factory for `DiagnosticCollection` instances.
 *   - Proxies `getDiagnostics(resource?)` to Mountain via RPC (`$getDiagnostics`).
 *   - Fires `onDidChangeDiagnostics` based on Mountain's `$acceptMarkersChange` RPC.
 * - `ShimDiagnosticCollectionImpl` (implements `vscode.DiagnosticCollection`):
 *   - Manages diagnostics for a specific owner.
 *   - Converts `vscode.Diagnostic` API objects to `ILocalMarkerData` DTOs for RPC.
 *   - Sends diagnostic changes to Mountain via RPC (`$changeMany`, `$clear`).
 *
 * Key Interactions:
 * - `ShimDiagnosticsService` registered with DI as `IExtHostDiagnostics`.
 * - `vscode.languages.createDiagnosticCollection` delegates to this service.
 * - RPC communication with `MainContext.MainThreadDiagnostics` on Mountain.
 * - Uses `BaseCocoonShim`.
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
import {
	MarkerSeverity as InternalMarkerSeverity,
	MarkerTag as InternalMarkerTag,
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

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Local DTO and Enum Definitions (Matching protocol/internal types) ---

/** DTO for URI components sent over RPC. */
interface ILocalUriComponents extends VSCodeInternalUriComponents {
	// $mid is often added by marshallers, ensure it's compatible
}

/** DTO for related information within a diagnostic/marker. */
interface ILocalRelatedInformation {
	resource: ILocalUriComponents; // URI DTO
	message: string;
	startLineNumber: number; // 1-based
	startColumn: number; // 1-based
	endLineNumber: number;
	endColumn: number;
}

/** DTO for individual diagnostic/marker data sent to MainThread. */
interface ILocalMarkerData {
	severity: InternalMarkerSeverity;
	message: string;
	startLineNumber: number; // 1-based
	startColumn: number; // 1-based
	endLineNumber: number;
	endColumn: number;
	source?: string;
	code?: string | { value: string; target: ILocalUriComponents };
	relatedInformation?: ILocalRelatedInformation[];
	tags?: InternalMarkerTag[];
}

/** Defines the RPC interface for the `MainThreadDiagnostics` service. */
interface MainThreadDiagnosticsShape {
	$changeMany(
		owner: string,
		entries: [ILocalUriComponents, ILocalMarkerData[] | undefined][],
	): Promise<void>;
	$clear(owner: string): Promise<void>;
	$getDiagnostics(
		resourceFilter?: ILocalUriComponents,
	): Promise<ILocalMarkerData[]>;
}

/** Defines the RPC interface for this `ExtHostDiagnostics` service, for methods called BY Mountain. */
interface ExtHostDiagnosticsRpcShape {
	// VS Code uses $acceptMarkersChange with the entries array
	$acceptMarkersChange(
		entries: [ILocalUriComponents, ILocalMarkerData[] | undefined][],
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
	readonly #uriMarshaller: (
		uri: VscodeUri,
	) => ILocalUriComponents | undefined;
	readonly #uriReviverForCodeTarget: (
		dto: ILocalUriComponents,
	) => VscodeUri | undefined;

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
				}
			} else {
				const newDiags = [...diags];
				this.#diagnosticsCache.set(uriString, newDiags);
				try {
					const markerDataArray = newDiags.map((d) =>
						this._convertDiagnosticToMarkerData(d),
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
					const uriForMarshalling = VscodeUri.parse(uriStr, true);
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
				const uriDto = this.#uriMarshaller(uri);
				if (uriDto) {
					this.#mainThreadDiagnosticsProxy
						.$changeMany(this.#ownerId, [[uriDto, undefined]])
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
			this.clear();
			this.#mainThreadDiagnosticsProxy = null;
			this.#logService = undefined;
			this.#diagnosticsCache.clear();
		}
	}

	private _convertDiagnosticToMarkerData(diag: Diagnostic): ILocalMarkerData {
		if (!diag.range) {
			this._logImplError(
				"Diagnostic is missing 'range'. Defaulting to line 1, char 1.",
				diag,
			);
			diag.range = new VscodeRange(0, 0, 0, 0);
		}

		const severity = (): InternalMarkerSeverity => {
			switch (diag.severity) {
				case DiagnosticSeverity.Error:
					return InternalMarkerSeverity.Error;
				case DiagnosticSeverity.Warning:
					return InternalMarkerSeverity.Warning;
				case DiagnosticSeverity.Information:
					return InternalMarkerSeverity.Info;
				case DiagnosticSeverity.Hint:
					return InternalMarkerSeverity.Hint;
				default:
					this._logImplWarn(
						`Unknown vscode.DiagnosticSeverity: ${diag.severity}. Defaulting to InternalMarkerSeverity.Error.`,
					);
					return InternalMarkerSeverity.Error;
			}
		};

		let markerCodeDto:
			| string
			| { value: string; target: ILocalUriComponents }
			| undefined = undefined;
		if (diag.code !== undefined && diag.code !== null) {
			if (
				typeof diag.code === "object" &&
				diag.code.target instanceof VscodeUri
			) {
				const targetUriDto = this.#uriMarshaller(diag.code.target); // Use the injected marshaller
				if (targetUriDto) {
					markerCodeDto = {
						value: String(diag.code.value),
						target: targetUriDto,
					};
				} else {
					this._logImplWarn(
						"Failed to convert target URI in diagnostic code to DTO. Storing code value only.",
						diag.code,
					);
					markerCodeDto = String(diag.code.value);
				}
			} else if (typeof diag.code === "object") {
				markerCodeDto = String(diag.code.value);
			} else {
				markerCodeDto = String(diag.code);
			}
		}

		const relatedInformationDto = diag.relatedInformation
			?.map((ri) => {
				const resourceDto = this.#uriMarshaller(ri.location.uri);
				if (!resourceDto) {
					this._logImplWarn(
						"Failed to convert URI for relatedInformation to DTO. Skipping related info item.",
						ri.location.uri,
					);
					return undefined;
				}
				return {
					resource: resourceDto,
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

		const tagsDto = diag.tags
			?.map((tagValue) => {
				if (tagValue === DiagnosticTag.Unnecessary)
					return InternalMarkerTag.Unnecessary;
				if (tagValue === DiagnosticTag.Deprecated)
					return InternalMarkerTag.Deprecated;
				this._logImplWarn(
					`Unsupported vscode.DiagnosticTag: ${tagValue}. Omitting tag from DTO.`,
				);
				return undefined;
			})
			.filter((t) => t !== undefined) as InternalMarkerTag[] | undefined;

		return {
			severity: severity(),
			message: diag.message || "",
			startLineNumber: diag.range.start.line + 1,
			startColumn: diag.range.start.character + 1,
			endLineNumber: diag.range.end.line + 1,
			endColumn: diag.range.end.character + 1,
			source: diag.source,
			code: markerCodeDto,
			relatedInformation: relatedInformationDto,
			tags: tagsDto,
		};
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
			(uri: VscodeUri) =>
				this._convertApiArgToInternal(uri) as
					| ILocalUriComponents
					| undefined,
			(dto: ILocalUriComponents) =>
				this._reviveApiArgument<VscodeUri>(dto),
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
				? (this._convertApiArgToInternal(
						resource,
					) as ILocalUriComponents)
				: undefined;
			const markersDataArray =
				await this.#mainThreadDiagnosticsProxy.$getDiagnostics(
					resourceFilterDto,
				);
			return Object.freeze(
				this._convertMarkersArrayToDiagnosticsArray(
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

	public $acceptMarkersChange(
		entries: [ILocalUriComponents, ILocalMarkerData[] | undefined][],
	): void {
		const changedUriCount = entries.length;
		this._logTrace(
			`RPC $acceptMarkersChange received for ${changedUriCount} URIs.`,
		);
		const changedVscodeUris: VscodeUri[] = [];
		for (const [uriComp /*, _markers*/] of entries) {
			try {
				const revivedUri = this._reviveApiArgument<VscodeUri>(uriComp);
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
			this._logTrace(
				`Fired onDidChangeDiagnostics event for ${changedVscodeUris.length} URIs.`,
			);
		}
	}

	private _convertMarkersArrayToDiagnosticsArray(
		markersDataArray: ILocalMarkerData[],
	): Diagnostic[] {
		return markersDataArray.map((markerData) => {
			const severityMap: {
				[key in InternalMarkerSeverity]?: DiagnosticSeverity;
			} = {
				[InternalMarkerSeverity.Error]: DiagnosticSeverity.Error,
				[InternalMarkerSeverity.Warning]: DiagnosticSeverity.Warning,
				[InternalMarkerSeverity.Info]: DiagnosticSeverity.Information,
				[InternalMarkerSeverity.Hint]: DiagnosticSeverity.Hint,
			};
			const severity =
				severityMap[markerData.severity] ?? DiagnosticSeverity.Error;
			const diagnosticRange = new VscodeRange(
				markerData.startLineNumber - 1,
				markerData.startColumn - 1,
				markerData.endLineNumber - 1,
				markerData.endColumn - 1,
			);
			const diagnostic = new Diagnostic(
				diagnosticRange,
				markerData.message || "",
				severity,
			);
			if (markerData.source) diagnostic.source = markerData.source;

			if (typeof markerData.code === "string") {
				diagnostic.code = markerData.code;
			} else if (markerData.code && typeof markerData.code === "object") {
				const targetUri = markerData.code.target
					? this._reviveApiArgument<VscodeUri>(markerData.code.target)
					: undefined;
				if (targetUri instanceof VscodeUri) {
					diagnostic.code = {
						value: String(markerData.code.value),
						target: targetUri,
					};
				} else {
					this._logWarn(
						"Failed to revive target URI for diagnostic code from MainThread DTO:",
						markerData.code.target,
					);
					diagnostic.code = String(markerData.code.value);
				}
			}

			if (markerData.relatedInformation) {
				diagnostic.relatedInformation = markerData.relatedInformation
					.map((info) => {
						const locUri = this._reviveApiArgument<VscodeUri>(
							info.resource,
						);
						if (!(locUri instanceof VscodeUri)) {
							this._logWarn(
								"Failed to revive URI for relatedInformation from MainThread DTO:",
								info.resource,
							);
							return null;
						}
						return new VscodeDiagnosticRelatedInformation(
							new VscodeLocation(
								locUri,
								new VscodeRange(
									info.startLineNumber - 1,
									info.startColumn - 1,
									info.endLineNumber - 1,
									info.endColumn - 1,
								),
							),
							info.message,
						);
					})
					.filter(
						(ri) => ri !== null,
					) as VscodeDiagnosticRelatedInformation[];
			}
			if (markerData.tags) {
				diagnostic.tags = markerData.tags
					.map((tag) => {
						if (tag === InternalMarkerTag.Unnecessary)
							return DiagnosticTag.Unnecessary;
						if (tag === InternalMarkerTag.Deprecated)
							return DiagnosticTag.Deprecated;
						this._logWarn(
							"Unknown InternalMarkerTag from MainThread:",
							tag,
							"Omitting tag.",
						);
						return undefined;
					})
					.filter((t) => t !== undefined) as DiagnosticTag[];
			}
			return diagnostic;
		});
	}

	public override dispose(): void {
		super.dispose();
		this._logInfo("Disposed.");
	}
}
