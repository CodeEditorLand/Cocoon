/*---------------------------------------------------------------------------------------------
 * Cocoon Diagnostics Shim (shims/diagnostics-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.languages.createDiagnosticCollection` API (which returns a
 * `vscode.DiagnosticCollection`) and other diagnostics-related parts of the
 * `vscode.languages` namespace, such as `getDiagnostics` and `onDidChangeDiagnostics`.
 * This functionality is typically managed by an `IExtHostDiagnostics` service.
 *
 * This shim allows extensions to report problems (diagnostics or markers) for specific
 * document URIs. These diagnostics are then proxied to the Mountain host process,
 * 
 * 
 * 
 * 
 *
 * which is responsible for displaying them in the editor's UI (e.g., in the Problems panel
 * and as squigglies in the editor).
 *
 * Responsibilities:
 * - `ShimDiagnosticsService` (implements `IExtHostDiagnostics`):
 *   - Provides `createDiagnosticCollection(name?)`: Creates and returns an instance
 *     of `ShimDiagnosticCollectionImpl`. Each collection is associated with a unique
 *     owner ID for communication with the main thread.
 *   - Implements `getDiagnostics(resource?)`: Proxies to Mountain (`$getMany`) to fetch
 *     aggregated diagnostics for a given resource URI.
 *   - Manages and fires `onDidChangeDiagnostics`: An event that signals when diagnostics
 *     for one or more resources have changed, typically triggered by an RPC call
 *     (`$acceptDiagnosticsChanged`) from Mountain.
 * - `ShimDiagnosticCollectionImpl` (implements `vscode.DiagnosticCollection`):
 *   - Provides the API for managing diagnostics within a specific collection (e.g.,
 * 
 * 
 * 
 * 
 *
 *     `set(uri, diagnostics)`, `delete(uri)`, `clear()`).
 *   - Converts `vscode.Diagnostic` objects into an internal `IMarkerData`-like DTO format.
 *   - Sends batches of diagnostic changes to Mountain via the `$changeMany` RPC call.
 *   - Clears all diagnostics for its collection on the main thread via `$clear` RPC.
 *   - Provides local cache access methods (`get()`, `has()`, `forEach()`).
 *   - Handles its own disposal, notifying the main thread.
 *
 * Key Interactions:
 * - `ShimDiagnosticsService` is registered with DI in `Cocoon/index.ts` as `IExtHostDiagnostics`.
 * - The `vscode.languages.createDiagnosticCollection` API (and related diagnostics features)
 *   provided to extensions (via the API factory) delegate to this service.
 * - All operations that modify or query persistent diagnostic state are proxied to
 *   `MainContext.MainThreadDiagnostics` on Mountain via RPC.
 * - Uses `BaseCocoonShim` for common utilities.
 *

 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
// For RPC DTOs

import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
// VS Code internal types for markers, which diagnostics are converted to for the main thread.
import {
	// VS Code's internal enum
	MarkerSeverity as InternalMarkerSeverity,
	// VS Code's internal enum
	MarkerTag as InternalMarkerTag,
	// Assuming IMarkerData, MarkerSeverity, MarkerTag are available or accurately defined locally.
	// If importing from 'vs/platform/markers/common/markers':
	// Using ILocalMarkerData as a DTO, but IMarkerData is the target structure.
	type IMarkerData,
	// Using ILocalRelatedInformation
	// RelatedInformation as MarkerRelatedInformation,
} from "vs/platform/markers/common/markers";
import {
	// For registering this service for RPC calls from MainThread
	ExtHostContext,
	// For proxying to MainThreadDiagnostics
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";
// Import types from the public 'vscode' API
import {
	Diagnostic,
	DiagnosticRelatedInformation,
	// API enum
	DiagnosticSeverity,
	// API enum
	DiagnosticTag,
	// For Diagnostic.tags, though not directly used in conversion here
	ThemeColor,
	// API type
	Location as VscodeLocation,
	// API type
	Range as VscodeRange,
	// API type
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

// --- Local DTO and Enum Definitions (if not directly using VS Code internals) ---
// These should accurately mirror the structures expected by MainThreadDiagnostics
// and produced by this shim's conversion logic.

/** DTO for URI components sent over RPC. */
interface ILocalUriComponents extends VSCodeInternalUriComponents {
	// $mid is often added by marshallers, ensure it's compatible
}

/** DTO for individual diagnostic/marker data sent to MainThread. */
interface ILocalMarkerData {
	// Use VS Code's internal MarkerSeverity enum values
	severity: InternalMarkerSeverity;

	message: string;

	// 1-based
	startLineNumber: number;

	// 1-based
	startColumn: number;

	endLineNumber: number;

	endColumn: number;

	source?: string;

	// target is URI DTO
	code?: string | { value: string; target: ILocalUriComponents };

	relatedInformation?: ILocalRelatedInformation[];

	// Use VS Code's internal MarkerTag enum values
	tags?: InternalMarkerTag[];

	// Owner is usually the collection's ownerId, sent with $changeMany
	// owner: string;

	// Resource is part of the [uri, markers[]] entry
	// resource: ILocalUriComponents;
}

/** DTO for related information within a diagnostic/marker. */
interface ILocalRelatedInformation {
	// URI DTO
	resource: ILocalUriComponents;

	message: string;

	// 1-based
	startLineNumber: number;

	// 1-based
	startColumn: number;

	endLineNumber: number;

	endColumn: number;
}

/**
 * Defines the RPC interface for the `MainThreadDiagnostics` service expected on Mountain.
 */
interface MainThreadDiagnosticsShape {
	/**
	 * Applies diagnostic changes for multiple resources from a specific owner.
	 * @param owner The unique identifier of the diagnostic collection.
	 * @param entries An array of tuples: `[uriComponents, markerDataArray | undefined]`.
	 *                If `markerDataArray` is `undefined`, all diagnostics for that URI from this owner are cleared.
	 */
	$changeMany(
		owner: string,

		entries: [ILocalUriComponents, ILocalMarkerData[] | undefined][],
	): Promise<void>;

	/**
	 * Clears all diagnostics from a specific owner.
	 * @param owner The unique identifier of the diagnostic collection.
	 */
	$clear(owner: string): Promise<void>;

	/**
	 * Retrieves all markers (diagnostics) for a given resource URI, aggregated from all owners.
	 * @param resourceFilter Optional URI (as components) to filter diagnostics for. If undefined, gets all.
	 * @returns A promise resolving to an array of marker data.
	 */
	$getMany(resourceFilter?: ILocalUriComponents): Promise<ILocalMarkerData[]>;
}

/**
 * Defines the RPC interface for this `ExtHostDiagnostics` service, for methods called BY Mountain.
 */
interface ExtHostDiagnosticsRpcShape {
	/**
	 * Called by Mountain to notify the extension host that diagnostics for certain URIs have changed.
	 * @param uris An array of URI components for which diagnostics have changed.
	 */
	$acceptDiagnosticsChanged(uris: ILocalUriComponents[]): void;
}

type DiagnosticEntryTuple = [
	VscodeUri,

	readonly Diagnostic[] | undefined | null,

	// From vscode.DiagnosticCollection.set
];

/**
 * Cocoon's implementation of `vscode.DiagnosticCollection`.
 */
class ShimDiagnosticCollectionImpl implements DiagnosticCollection {
	// The human-readable name of the collection.
	readonly #collectionName?: string;

	// Unique ID for this collection, used in RPC calls.
	readonly #ownerId: string;

	#mainThreadDiagnosticsProxy: MainThreadDiagnosticsShape | null;

	#logService?: ILogServiceForShim;

	#isDisposed = false;

	// Local cache of diagnostics: Map<uri.toString(), vscode.Diagnostic[]>
	readonly #diagnosticsCache = new Map<string, Diagnostic[]>();

	/**
	 * Creates an instance of ShimDiagnosticCollectionImpl.
	 * @param name The optional human-readable name of this collection.
	 * @param ownerId A unique identifier for this collection on the main thread.
	 * @param proxy The RPC proxy to `MainThreadDiagnostics`.
	 * @param logService The logging service.
	 */
	constructor(
		name: string | undefined,

		ownerId: string,

		proxy: MainThreadDiagnosticsShape | null,

		logService?: ILogServiceForShim,
	) {
		this.#collectionName = name;

		this.#ownerId = ownerId;

		this.#mainThreadDiagnosticsProxy = proxy;

		this.#logService = logService;

		this._log(
			`Created collection. Name='${name || "(unnamed)"}', OwnerID='${this.#ownerId}'`,
		);
	}

	private _log(message: string, ...args: any[]): void {
		this.#logService?.trace(
			`[DiagCol][${this.#collectionName || this.#ownerId}] ${message}`,

			...args,
		);
	}

	private _logError(message: string | Error, ...args: any[]): void {
		const prefix = `[DiagCol][${this.#collectionName || this.#ownerId}]`;

		if (this.#logService) {
			this.#logService.error(
				message instanceof Error ? message : `${prefix} ${message}`,

				...args,
			);
		} else {
			if (message instanceof Error)
				console.error(
					`${prefix} ${message.message}`,

					message.stack,

					...args,
				);
			else console.error(`${prefix} ${message}`, ...args);
		}
	}

	private _logWarn(message: string, ...args: any[]): void {
		this.#logService?.warn(
			`[DiagCol][${this.#collectionName || this.#ownerId}] ${message}`,

			...args,
		);
	}

	/** Throws an error if the collection has been disposed. */
	private _validateNotDisposed(): void {
		if (this.#isDisposed) {
			throw new Error(
				`DiagnosticCollection '${this.#collectionName || this.#ownerId}' has been disposed.`,
			);
		}
	}

	/** Name of this diagnostic collection. */
	get name(): string {
		// VS Code API expects string, even if unnamed.
		return this.#collectionName || "";
	}

	/** {@inheritDoc vscode.DiagnosticCollection.set} */
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

		const entriesToSyncWithMainThread = new Map<
			string,
			ILocalMarkerData[] | undefined
		>();

		const processEntry = (
			uri: VscodeUri,

			diags: readonly Diagnostic[] | undefined | null,
		): void => {
			if (!(uri instanceof VscodeUri)) {
				this._logWarn(
					"Skipping invalid URI in DiagnosticCollection.set():",

					uri,
				);

				return;
			}

			const uriString = uri.toString();

			let newDiagnosticsForUri: Diagnostic[] | undefined;

			if (diags === undefined || diags === null || diags.length === 0) {
				if (this.#diagnosticsCache.delete(uriString)) {
					// Changed from previous state
					// Undefined means clear for this URI
					entriesToSyncWithMainThread.set(uriString, undefined);
				}
			} else {
				// Create a mutable copy
				newDiagnosticsForUri = [...diags];

				this.#diagnosticsCache.set(uriString, newDiagnosticsForUri);

				try {
					const markerData = newDiagnosticsForUri.map((d) =>
						this._convertDiagnosticToMarkerData(d),
					);

					entriesToSyncWithMainThread.set(uriString, markerData);
				} catch (conversionError: any) {
					this._logError(
						`Error converting diagnostics to marker data for URI '${uriString}'. Diagnostics for this URI will not be synced. Error: ${conversionError.message}`,

						conversionError,
					);

					// Optionally, clear this URI on main thread if previously set, or leave as is.
					// For safety, perhaps don't send a clear if conversion fails, to avoid unintended deletion.
				}
			}
		};

		if (firstParam instanceof VscodeUri) {
			processEntry(firstParam, diagnosticsOrUndefined);
		} else if (Array.isArray(firstParam)) {
			for (const [uri, diags] of firstParam) {
				processEntry(uri, diags);
			}
		} else {
			this._logError(
				"Invalid arguments to DiagnosticCollection.set(). Expected URI or array of entries.",
			);

			return;
		}

		if (
			entriesToSyncWithMainThread.size > 0 &&
			this.#mainThreadDiagnosticsProxy
		) {
			const rpcEntries: [
				ILocalUriComponents,

				ILocalMarkerData[] | undefined,
			][] = [];

			for (const [
				uriStr,

				markerDataArray,
			] of entriesToSyncWithMainThread) {
				try {
					const uriForRpc = this._uriToComponentsDto(
						VscodeUri.parse(uriStr),

						// Parse back to VscodeUri then to DTO
					);

					if (uriForRpc) {
						rpcEntries.push([uriForRpc, markerDataArray]);
					} else {
						this._logError(
							`Failed to convert URI string '${uriStr}' to DTO for RPC. Skipping sync for this URI.`,
						);
					}
				} catch (e: any) {
					this._logError(
						`Error parsing URI string '${uriStr}' during sync preparation: ${e.message}. Skipping sync for this URI.`,
					);
				}
			}

			if (rpcEntries.length > 0) {
				// this._log(`Sending ${rpcEntries.length} diagnostic change(s) to MainThread via $changeMany.`);

				this.#mainThreadDiagnosticsProxy
					.$changeMany(this.#ownerId, rpcEntries)
					.catch((err) =>
						this._logError(
							`RPC $changeMany call failed:`,

							refineErrorForShim(
								err,

								this.#logService,

								"$changeMany",
							),
						),
					);
			}
		}

		// TODO: If ShimDiagnosticsService holds onDidChangeDiagnostics, it should be notified here.
		// Get the parent service instance and call a method like:
		// this._diagnosticsServiceInstance.$notifyDiagnosticsChangedForOwner(this.#ownerId, Array.from(entriesToSyncWithMainThread.keys()).map(s => VscodeUri.parse(s)));
	}

	/** {@inheritDoc vscode.DiagnosticCollection.delete} */
	public delete(uri: VscodeUri): void {
		this._validateNotDisposed();

		if (!(uri instanceof VscodeUri)) {
			this._logError(
				"Invalid URI passed to DiagnosticCollection.delete():",

				uri,
			);

			return;
		}

		const uriString = uri.toString();

		if (this.#diagnosticsCache.delete(uriString)) {
			// If it existed locally
			// this._log(`Deleted diagnostics locally for URI: ${uriString}`);

			if (this.#mainThreadDiagnosticsProxy) {
				const uriDto = this._uriToComponentsDto(uri);

				if (uriDto) {
					// this._log(`Sending deletion to MainThread for URI: ${uriString}`);

					this.#mainThreadDiagnosticsProxy
						// undefined markers means clear
						.$changeMany(this.#ownerId, [[uriDto, undefined]])
						.catch((err) =>
							this._logError(
								`RPC $changeMany for delete failed on URI '${uriString}':`,

								refineErrorForShim(
									err,

									this.#logService,

									"delete",
								),
							),
						);
				} else {
					this._logError(
						`Failed to convert URI '${uriString}' to DTO for delete RPC. Diagnostics on MainThread may persist.`,
					);
				}
			}

			// TODO: Notify parent service about change for this URI.
		}
	}

	/** {@inheritDoc vscode.DiagnosticCollection.clear} */
	public clear(): void {
		this._validateNotDisposed();

		if (this.#diagnosticsCache.size > 0) {
			const clearedUris = Array.from(this.#diagnosticsCache.keys());

			this._log(
				`Clearing all ${this.#diagnosticsCache.size} URIs locally from collection '${this.#collectionName || this.#ownerId}'.`,
			);

			this.#diagnosticsCache.clear();

			if (this.#mainThreadDiagnosticsProxy) {
				// this._log(`Sending $clear request to MainThread for owner '${this.#ownerId}'.`);

				this.#mainThreadDiagnosticsProxy
					.$clear(this.#ownerId)
					.catch((err) =>
						this._logError(
							`RPC $clear call failed for owner '${this.#ownerId}':`,

							refineErrorForShim(err, this.#logService, "clear"),
						),
					);
			}

			// TODO: Notify parent service about changes for all clearedUris.
		} else {
			// this._log("clear() called, but collection was already empty locally.");
		}
	}

	/** {@inheritDoc vscode.DiagnosticCollection.forEach} */
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
				uriInstance = VscodeUri.parse(uriString);
			} catch (e: any) {
				this._logError(
					`Error parsing cached URI string '${uriString}' in forEach. Skipping entry.`,

					e,
				);

				// Skip this entry
				return;
			}

			try {
				// Provide a readonly array to the callback, as per vscode.d.ts.
				callback.call(
					thisArg,

					uriInstance,

					Object.freeze([...diagnosticsArray]),

					this,
				);
			} catch (cbError: any) {
				this._logError(
					`Error in DiagnosticCollection.forEach callback for URI ${uriString}:`,

					cbError,
				);

				// Continue to next item even if one callback fails.
			}
		});
	}

	/** {@inheritDoc vscode.DiagnosticCollection.get} */
	public get(uri: VscodeUri): readonly Diagnostic[] | undefined {
		this._validateNotDisposed();

		if (!(uri instanceof VscodeUri)) {
			this._logError(
				"Invalid URI passed to DiagnosticCollection.get():",

				uri,
			);

			return undefined;
		}

		const diagnosticsArray = this.#diagnosticsCache.get(uri.toString());

		// Return a readonly copy if found.
		return diagnosticsArray
			? Object.freeze([...diagnosticsArray])
			: undefined;
	}

	/** {@inheritDoc vscode.DiagnosticCollection.has} */
	public has(uri: VscodeUri): boolean {
		this._validateNotDisposed();

		if (!(uri instanceof VscodeUri)) {
			this._logError(
				"Invalid URI passed to DiagnosticCollection.has():",

				uri,
			);

			return false;
		}

		return this.#diagnosticsCache.has(uri.toString());
	}

	/** {@inheritDoc vscode.DiagnosticCollection.dispose} */
	public dispose(): void {
		if (!this.#isDisposed) {
			this._log(
				`dispose() called for collection '${this.#collectionName || this.#ownerId}'.`,
			);

			this.#isDisposed = true;

			// Clear diagnostics on main thread as part of disposal.
			this.clear();

			// Release proxy reference
			this.#mainThreadDiagnosticsProxy = null;

			// Release log service reference
			this.#logService = undefined;

			// Clear local cache
			this.#diagnosticsCache.clear();

			// TODO: Notify ShimDiagnosticsService that this collection instance is disposed,

			// so it can be removed from any internal tracking if the service manages collection instances.
		}
	}

	/** Converts a vscode.Uri to ILocalUriComponents DTO for RPC. */
	private _uriToComponentsDto(
		uri: VscodeUri,
	): ILocalUriComponents | undefined {
		// Use _convertApiArgToInternal from BaseCocoonShim, which should handle Uri marshalling.
		// It's expected to return an object that matches ILocalUriComponents (or VSCodeInternalUriComponents).
		const components = (
			this as any as BaseCocoonShim
		)._convertApiArgToInternal(uri);

		if (
			components &&
			(components.$mid === 1 /* MarshalledId.UriSimple */ ||
				(components.scheme && components.path))
		) {
			return components as ILocalUriComponents;
		}

		this._logError(
			"Failed to convert VscodeUri to ILocalUriComponents DTO for RPC via BaseCocoonShim.",

			uri,

			"Resulting components:",

			components,
		);

		// Fallback if conversion fails
		return undefined;
	}

	/** Converts a vscode.Diagnostic object to an ILocalMarkerData DTO for RPC. */
	private _convertDiagnosticToMarkerData(diag: Diagnostic): ILocalMarkerData {
		if (!diag.range) {
			// Should always have a range
			this._logError(
				"Diagnostic is missing 'range'. Defaulting to line 1, char 1.",

				diag,
			);

			// Create a default range to prevent crashes, though this indicates an issue with the diagnostic source.
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
					this._logWarn(
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
				const targetUriDto = this._uriToComponentsDto(diag.code.target);

				if (targetUriDto) {
					markerCodeDto = {
						value: String(diag.code.value),

						target: targetUriDto,
					};
				} else {
					this._logWarn(
						"Failed to convert target URI in diagnostic code to DTO. Storing code value only.",

						diag.code,
					);

					// Fallback
					markerCodeDto = String(diag.code.value);
				}
			} else if (typeof diag.code === "object") {
				// e.g. { value: number | string; target: string_uri_deprecated }

				markerCodeDto = String(diag.code.value);
			} else {
				// string or number
				markerCodeDto = String(diag.code);
			}
		}

		const relatedInformationDto = diag.relatedInformation
			?.map((ri) => {
				const resourceDto = this._uriToComponentsDto(ri.location.uri);

				if (!resourceDto) {
					this._logWarn(
						"Failed to convert URI for relatedInformation to DTO. Skipping related info item.",

						ri.location.uri,
					);

					return undefined;
				}

				return {
					resource: resourceDto,

					message: ri.message,

					// Convert 0-based to 1-based
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

				// TODO: Map other DiagnosticTags if VS Code API adds more that correspond to InternalMarkerTag.
				this._logWarn(
					`Unsupported vscode.DiagnosticTag: ${tagValue}. Omitting tag from DTO.`,
				);

				return undefined;
			})
			.filter((t) => t !== undefined) as InternalMarkerTag[] | undefined;

		return {
			severity: severity(),

			// Ensure message is a string
			message: diag.message || "",

			// API is 0-based, IMarkerData is 1-based
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

/**
 * Cocoon's implementation of `IExtHostDiagnostics`.
 * Manages diagnostic collections and aggregates diagnostics.
 */
export class ShimDiagnosticsService
	extends BaseCocoonShim
	implements ExtHostDiagnosticsRpcShape
{
	// For IExtHostDiagnostics if registered with DI
	public readonly _serviceBrand: undefined;

	#mainThreadDiagnosticsProxy: MainThreadDiagnosticsShape | null = null;

	// To generate unique owner IDs for collections
	#collectionOwnerCounter = 0;

	readonly #onDidChangeDiagnosticsEmitter = new VscodeEmitter<
		readonly VscodeUri[]
	>();

	public readonly onDidChangeDiagnostics: VscodeEvent<readonly VscodeUri[]> =
		this.#onDidChangeDiagnosticsEmitter.event;

	/**
	 * Creates an instance of ShimDiagnosticsService.
	 * @param rpcService The RPC service adapter.
	 * @param logService The logging service.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostDiagnostics", rpcService, logService);

		this._log("Initialized.");

		if (this._rpcService) {
			this.#mainThreadDiagnosticsProxy = this._getProxy(
				MainContext.MainThreadDiagnostics as ProxyIdentifier<MainThreadDiagnosticsShape>,
			);

			// Register self to handle RPC calls from MainThreadDiagnostics (e.g., $acceptDiagnosticsChanged)
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostDiagnostics as ProxyIdentifier<ExtHostDiagnosticsRpcShape>,

					this,
				);

				this._log(
					"Registered self for RPC calls from MainThread (ExtHostDiagnostics).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to set self for RPC (ExtHostDiagnostics):",

					e,
				);
			}
		}

		if (!this.#mainThreadDiagnosticsProxy) {
			this._logError(
				"Failed to get MainThreadDiagnostics RPC proxy! Diagnostic collections will not sync effectively, and getDiagnostics will fail.",
			);
		}
	}

	/**
	 * Creates a new diagnostic collection.
	 * @param name Optional human-readable name for the collection.
	 * @returns A `vscode.DiagnosticCollection` instance.
	 */
	public createDiagnosticCollection(name?: string): DiagnosticCollection {
		// this._log(`createDiagnosticCollection called: Name='${name || "(unnamed)"}'`);

		if (!this.#mainThreadDiagnosticsProxy) {
			this._logError(
				`Cannot create DiagnosticCollection '${name || "(unnamed)"}': MainThreadDiagnostics RPC proxy unavailable. Returning NOP collection.`,
			);

			return this._createNopDiagnosticCollection(name);
		}

		// Generate a unique owner ID for this collection for MainThread tracking.
		const ownerId = `cocoon_diag_owner_${this.#collectionOwnerCounter++}_${name || "anon"}`;

		// this._log(`Assigning OwnerID='${ownerId}' to new collection.`);

		return new ShimDiagnosticCollectionImpl(
			name,

			ownerId,

			this.#mainThreadDiagnosticsProxy,

			this._logService,
		);
	}

	private _createNopDiagnosticCollection(
		name?: string,
	): DiagnosticCollection {
		this._logWarn(
			`Creating NOP (No-Operation) DiagnosticCollection: Name='${name || "(unnamed)"}' due to unavailable RPC proxy.`,
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

	/**
	 * Retrieves all diagnostics for a given resource, aggregated from all collections.
	 * @param resource Optional URI of the resource to get diagnostics for. If undefined,
	 *
	 *
	 *
	 *
	 *
	 *                 VS Code's API typically doesn't support fetching *all* diagnostics
	 *                 across all files easily; this might be a NOP or error.
	 *                 This shim's `$getMany` proxy assumes it might get all if `resourceFilter` is undefined.
	 * @returns A promise resolving to a readonly array of `vscode.Diagnostic` objects.
	 */
	public async getDiagnostics(
		resource?: VscodeUri,
	): Promise<readonly Diagnostic[]> {
		this._log(
			`getDiagnostics called for resource: ${resource ? resource.toString() : "(all resources - if supported by MainThread)"}`,
		);

		if (!this.#mainThreadDiagnosticsProxy?.$getMany) {
			this._logError(
				"Cannot getDiagnostics: MainThreadDiagnosticsProxy.$getMany is not available or proxy is null. Returning empty array.",
			);

			return Object.freeze([]);
		}

		try {
			const resourceFilterDto = resource
				? ((this as any as BaseCocoonShim)._convertApiArgToInternal(
						resource,
					) as ILocalUriComponents)
				: undefined;

			const markersDataArray =
				await this.#mainThreadDiagnosticsProxy.$getMany(
					resourceFilterDto,
				);

			return Object.freeze(
				this._convertMarkersArrayToDiagnosticsArray(
					markersDataArray || [],
				),
			);
		} catch (e: any) {
			this._logError(
				"Failed to get diagnostics from MainThread via RPC $getMany:",

				refineErrorForShim(e, this._logService, "getDiagnostics"),
			);

			return Object.freeze([]);
		}
	}

	// --- RPC Method called BY MainThread (ExtHostDiagnosticsRpcShape) ---
	/**
	 * Called by Mountain to notify that diagnostics for specified URIs have changed.
	 * This triggers the `onDidChangeDiagnostics` event.
	 * @param uriComponentsArray An array of URI components (DTOs) for affected resources.
	 */
	public $acceptDiagnosticsChanged(
		uriComponentsArray: ILocalUriComponents[],
	): void {
		// this._log(`RPC $acceptDiagnosticsChanged received for ${uriComponentsArray.length} URIs.`);

		const changedVscodeUris: VscodeUri[] = [];

		for (const uriComp of uriComponentsArray) {
			try {
				const revivedUri = (
					this as any as BaseCocoonShim
				)._reviveApiArgument<VscodeUri>(uriComp);

				if (revivedUri instanceof VscodeUri) {
					changedVscodeUris.push(revivedUri);
				} else {
					this._logWarn(
						"$acceptDiagnosticsChanged: Failed to revive URI component from MainThread notification.",

						uriComp,
					);
				}
			} catch (e: any) {
				this._logError(
					"$acceptDiagnosticsChanged: Error reviving URI component during notification processing.",

					uriComp,

					e,
				);
			}
		}

		if (changedVscodeUris.length > 0) {
			this.#onDidChangeDiagnosticsEmitter.fire(
				Object.freeze(changedVscodeUris),
			);
		}
	}

	/** Converts an array of ILocalMarkerData DTOs to an array of vscode.Diagnostic objects. */
	private _convertMarkersArrayToDiagnosticsArray(
		markersDataArray: ILocalMarkerData[],
	): Diagnostic[] {
		return markersDataArray.map((markerData) => {
			// Convert 1-based from IMarkerData to 0-based for vscode.Range
			const range = new VscodeRange(
				markerData.startLineNumber - 1,

				markerData.startColumn - 1,

				markerData.endLineNumber - 1,

				markerData.endColumn - 1,
			);

			let severity: DiagnosticSeverity;

			switch (
				// Map from InternalMarkerSeverity
				markerData.severity
			) {
				case InternalMarkerSeverity.Error:
					severity = DiagnosticSeverity.Error;

					break;

				case InternalMarkerSeverity.Warning:
					severity = DiagnosticSeverity.Warning;

					break;

				case InternalMarkerSeverity.Info:
					severity = DiagnosticSeverity.Information;

					break;

				case InternalMarkerSeverity.Hint:
					severity = DiagnosticSeverity.Hint;

					break;

				default:
					this._logWarn(
						"Unknown InternalMarkerSeverity from MainThread:",

						markerData.severity,

						"Defaulting to DiagnosticSeverity.Error.",
					);

					severity = DiagnosticSeverity.Error;
			}

			const diagnostic = new Diagnostic(
				range,

				markerData.message || "",

				severity,
			);

			if (markerData.source) diagnostic.source = markerData.source;

			if (typeof markerData.code === "string") {
				diagnostic.code = markerData.code;
			} else if (markerData.code && typeof markerData.code === "object") {
				// { value, target: ILocalUriComponents }

				const targetUri = (
					this as any as BaseCocoonShim
				)._reviveApiArgument<VscodeUri>(markerData.code.target);

				if (targetUri instanceof VscodeUri) {
					diagnostic.code = {
						value: markerData.code.value,

						target: targetUri,
					};
				} else {
					this._logWarn(
						"Failed to revive target URI for diagnostic code from MainThread DTO:",

						markerData.code.target,
					);

					// Fallback to just the value
					diagnostic.code = markerData.code.value;
				}
			}

			if (markerData.relatedInformation) {
				diagnostic.relatedInformation = markerData.relatedInformation
					.map((riDto) => {
						const locUri = (
							this as any as BaseCocoonShim
						)._reviveApiArgument<VscodeUri>(riDto.resource);

						if (!(locUri instanceof VscodeUri)) {
							this._logWarn(
								"Failed to revive URI for relatedInformation from MainThread DTO:",

								riDto.resource,
							);

							// Skip this item
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

			if (markerData.tags) {
				diagnostic.tags = markerData.tags
					.map((tagValue_internal) => {
						// Map from InternalMarkerTag
						if (tagValue_internal === InternalMarkerTag.Unnecessary)
							return DiagnosticTag.Unnecessary;

						if (tagValue_internal === InternalMarkerTag.Deprecated)
							return DiagnosticTag.Deprecated;

						this._logWarn(
							"Unknown InternalMarkerTag from MainThread:",

							tagValue_internal,

							"Omitting tag.",
						);

						return undefined;
					})
					.filter((t) => t !== undefined) as DiagnosticTag[];
			}

			return diagnostic;
		});
	}

	/**
	 * Disposes of resources held by this shim instance.
	 */
	public override dispose(): void {
		// From BaseCocoonShim
		super.dispose();

		this.#onDidChangeDiagnosticsEmitter.dispose();

		this._log("Disposed.");
	}
}
