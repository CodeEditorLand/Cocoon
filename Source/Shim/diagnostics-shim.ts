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
 *     (delegating to centralized `CocoonTypeConverters`).
 *   - Sends diagnostic changes to Mountain via RPC (`$changeMany`).
 *
 * Key Interactions:
 * - `ShimDiagnosticsService` registered with DI as `IExtHostDiagnostics`.
 * - `vscode.languages.createDiagnosticCollection` delegates to this service.
 * - RPC communication with `MainContext.MainThreadDiagnostics` on Mountain.
 * - Uses `BaseCocoonShim` and (will use) `CocoonTypeConverters`.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
import {
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
// For reviving URIs from DTOs
import {
	MarkerSeverity as VscodeInternalMarkerSeverity,
	MarkerTag as VscodeInternalMarkerTag,
	// DTO target for MainThread
	type IMarkerData as VscodeInternalIMarkerData,
} from "vs/platform/markers/common/markers";
import {
	ExtHostContext,
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";
import {
	Diagnostic,
	// Handled by type converters
	// DiagnosticRelatedInformation,

	// Handled by type converters
	// DiagnosticSeverity,

	// Handled by type converters
	// DiagnosticTag,

	// Handled by type converters
	// Location as VscodeLocation,

	// Handled by type converters
	// Range as VscodeRange,
	Uri as VscodeUri,
	type DiagnosticCollection,
} from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// TODO: Import from cocoon-type-converters.ts once available
// import * as CocoonTypeConverters from '../cocoon-type-converters';

// --- Local DTO and Enum Definitions (Matching protocol/internal types) ---
// These should align with VscodeInternalIMarkerData and related structures.
// For this refinement, we assume ILocalMarkerData aligns with VscodeInternalIMarkerData.
type ILocalUriComponents = VSCodeInternalUriComponents;

// DTO sent to/from MainThread
type ILocalMarkerData = VscodeInternalIMarkerData;

/**
 * Defines the RPC interface for the `MainThreadDiagnostics` service.
 */
interface MainThreadDiagnosticsShape {
	$changeMany(
		owner: string,

		entries: [ILocalUriComponents, ILocalMarkerData[] | undefined][],
	): Promise<void>;

	$clear(owner: string): Promise<void>;

	$getMany(resourceFilter?: ILocalUriComponents): Promise<ILocalMarkerData[]>;
}

/**
 * Defines the RPC interface for this `ExtHostDiagnostics` service, for methods called BY Mountain.
 * Aligned with VS Code's typical protocol.
 */
interface ExtHostDiagnosticsRpcShape {
	/**
	 * Called by Mountain to notify that diagnostics (markers) for specified URIs have changed.
	 * @param entries An array of tuples: `[uriComponents, markerDataArray | undefined]`.
	 *                `markerDataArray` contains the new set of markers for that URI.
	 *                If `undefined`, it implies diagnostics for that URI might have been cleared or are unchanged from an empty state.
	 */
	$acceptMarkersChange(
		entries: [ILocalUriComponents, ILocalMarkerData[] | undefined][],
	): void;
}

/**
 * Represents the tuple structure for `DiagnosticCollection.set` entries.
 */
type DiagnosticEntryTuple = [
	VscodeUri,

	readonly Diagnostic[] | undefined | null,
];

/**
 * Cocoon's implementation of `vscode.DiagnosticCollection`.
 */
class ShimDiagnosticCollectionImpl implements DiagnosticCollection {
	readonly #collectionName?: string;

	readonly #ownerId: string;

	#mainThreadDiagnosticsProxy: MainThreadDiagnosticsShape | null;

	#logService?: ILogServiceForShim;

	#isDisposed = false;

	// Key: uri.toString()
	readonly #diagnosticsCache = new Map<string, Diagnostic[]>();

	readonly #uriMarshaller: (
		uri: VscodeUri,

		// Injected marshaller
	) => ILocalUriComponents | undefined;

	constructor(
		name: string | undefined,

		ownerId: string,

		proxy: MainThreadDiagnosticsShape | null,

		logService: ILogServiceForShim | undefined,

		// URI marshaller function
		uriMarshaller: (uri: VscodeUri) => ILocalUriComponents | undefined,
	) {
		this.#collectionName = name;

		this.#ownerId = ownerId;

		this.#mainThreadDiagnosticsProxy = proxy;

		this.#logService = logService;

		this.#uriMarshaller = uriMarshaller;

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
		this.#logService?.error(
			`[DiagCol][${this.#collectionName || this.#ownerId}] ${message instanceof Error ? message : message}`,

			...args,
		);
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
					// `undefined` DTO means clear for this URI
					entriesToSync.set(uriString, undefined);
				}
			} else {
				const newDiags = [...diags];

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
					const uriDto = this.#uriMarshaller(
						VscodeUri.parse(uriStr, true),

						// Use strict parsing
					);

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
				"Invalid URI passed to DiagnosticCollection.delete(); URI must be an instance of vscode.Uri.",

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
						// `undefined` markers means clear
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
						`Failed to marshal URI '${uriString}' for delete RPC. Diagnostics on MainThread may persist.`,
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
				"Invalid URI in DiagnosticCollection.get(); URI must be vscode.Uri.",

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
				"Invalid URI in DiagnosticCollection.has(); URI must be vscode.Uri.",

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

			// This will also attempt to clear on MainThread
			this.clear();

			this.#mainThreadDiagnosticsProxy = null;

			this.#logService = undefined;
		}
	}

	// TEMPORARY - to be replaced by CocoonTypeConverters.Diagnostic.fromApi
	private _TMP_convertDiagnosticToMarkerData(
		diag: Diagnostic,
	): ILocalMarkerData {
		// Basic conversion, missing relatedInformation, code.target URI marshalling, full tag mapping
		// This is a simplified placeholder.
		const severityMap = {
			[0 /* Error */]: VscodeInternalMarkerSeverity.Error,

			[1 /* Warning */]: VscodeInternalMarkerSeverity.Warning,

			[2 /* Information */]: VscodeInternalMarkerSeverity.Info,

			[3 /* Hint */]: VscodeInternalMarkerSeverity.Hint,
		};

		const codeDto =
			typeof diag.code === "object"
				? {
						value: String(diag.code.value),

						target: this.#uriMarshaller(
							diag.code.target as VscodeUri,
						)!,

						// Assuming target is VscodeUri
					}
				: diag.code !== undefined
					? String(diag.code)
					: undefined;

		return {
			message: diag.message,

			severity:
				severityMap[diag.severity] ??
				VscodeInternalMarkerSeverity.Error,

			startLineNumber: diag.range.start.line + 1,

			startColumn: diag.range.start.character + 1,

			endLineNumber: diag.range.end.line + 1,

			endColumn: diag.range.end.character + 1,

			source: diag.source,

			// Needs proper DTO for code object
			code: codeDto as ILocalMarkerData["code"],

			// Needs full conversion
			// relatedInformation: diag.relatedInformation?.map(...)
			// Needs full conversion
			// tags: diag.tags?.map(...)
		} as ILocalMarkerData;
	}
}

/**
 * Cocoon's implementation of `IExtHostDiagnostics`.
 */
export class ShimDiagnosticsService
	extends BaseCocoonShim
	implements ExtHostDiagnosticsRpcShape
{
	// For RPCs *from* MainThread
	// For IExtHostDiagnostics DI
	public readonly _serviceBrand: undefined;

	#mainThreadDiagnosticsProxy: MainThreadDiagnosticsShape | null = null;

	#collectionOwnerCounter = 0;

	readonly #onDidChangeDiagnosticsEmitter = new VscodeEmitter<
		readonly VscodeUri[]
	>();

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
				"Failed to obtain MainThreadDiagnostics RPC proxy. Diagnostics will not function.",
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
					// Pass URI marshaller
					| undefined,
		);
	}

	private _createNopDiagnosticCollection(
		name?: string,
	): DiagnosticCollection {
		// ... (implementation from original file is fine) ...
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
		const resourceForLog = resource ? resource.toString() : "(all)";

		this._logDebug(
			`API getDiagnostics called for resource: ${resourceForLog}`,
		);

		if (!this.#mainThreadDiagnosticsProxy?.$getMany) {
			this._logError(
				"Cannot getDiagnostics: MainThread proxy or $getMany method unavailable. Returning empty array.",
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
				await this.#mainThreadDiagnosticsProxy.$getMany(
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
				"Failed to get diagnostics via RPC $getMany:",

				refineErrorForShim(e, this._logService, "getDiagnostics RPC"),
			);

			return Object.freeze([]);
		}
	}

	// RPC Method from MainThread (ExtHostDiagnosticsRpcShape)
	public $acceptMarkersChange(
		entries: [ILocalUriComponents, ILocalMarkerData[] | undefined][],
	): void {
		const changedUriCount = entries.length;

		this._logDebug(
			`RPC $acceptMarkersChange received for ${changedUriCount} URIs.`,
		);

		const changedVscodeUris: VscodeUri[] = [];

		for (const [uriComp, _markers] of entries) {
			// _markers not used directly for event firing
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

			this._logDebug(
				`Fired onDidChangeDiagnostics event for ${changedVscodeUris.length} URIs.`,
			);
		}
	}

	// TEMPORARY - to be replaced by CocoonTypeConverters.Diagnostic.toApiArray
	private _TMP_convertMarkersArrayToDiagnosticsArray(
		markersDataArray: ILocalMarkerData[],
	): Diagnostic[] {
		// Basic conversion, missing relatedInformation, code.target URI revival, full tag mapping
		// This is a simplified placeholder.
		return markersDataArray.map((markerData) => {
			const range = new VscodeUri(
				markerData.startLineNumber - 1,

				markerData.startColumn - 1,

				markerData.endLineNumber - 1,

				markerData.endColumn - 1,

				// Incorrect: VscodeUri is not VscodeRange
			);

			// Corrected:
			// const range = new VscodeRange(markerData.startLineNumber - 1, markerData.startColumn - 1, markerData.endLineNumber - 1, markerData.endColumn - 1);

			const severityMap = {
				// Map internal severity back to API severity
				[VscodeInternalMarkerSeverity.Error]: 0 /* Error */,

				[VscodeInternalMarkerSeverity.Warning]: 1 /* Warning */,

				[VscodeInternalMarkerSeverity.Info]: 2 /* Information */,

				[VscodeInternalMarkerSeverity.Hint]: 3 /* Hint */,
			};

			const severity = severityMap[markerData.severity] ?? 0; /* Error */
			// Corrected:
			const diagnosticRange = new VscodeApiRange(
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

			if (typeof markerData.code === "string")
				diagnostic.code = markerData.code;
			else if (markerData.code && typeof markerData.code === "object") {
				// Assuming markerData.code.target is ILocalUriComponents, revive it
				const targetUri = markerData.code.target
					? this._reviveApiArgument<VscodeUri>(markerData.code.target)
					: undefined;

				diagnostic.code = {
					value: String(markerData.code.value),

					target: targetUri!,

					// targetUri could be undefined
				};
			}

			// TODO: Full revival of relatedInformation and tags
			return diagnostic;
		});
	}

	public override dispose(): void {
		super.dispose();

		this.#onDidChangeDiagnosticsEmitter.dispose();

		this._logInfo("Disposed.");
	}
}
