/*---------------------------------------------------------------------------------------------
 * Cocoon Diagnostics Shim (diagnostics-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.languages.createDiagnosticCollection` API, which returns a
 * `vscode.DiagnosticCollection`. It also provides other diagnostics-related features
 * of the `vscode.languages` namespace, such as `getDiagnostics` and `onDidChangeDiagnostics`.
 * This functionality is typically managed by an `IExtHostDiagnostics` service on the
 * extension host side.
 *
 * This shim enables extensions to report problems (diagnostics, often referred to as
 * markers internally in VS Code) for specific document URIs. These diagnostics are then
 * converted to a DTO format and proxied to the Mountain host process. Mountain is
 * responsible for aggregating these diagnostics from all sources and displaying them in
 * the editor's UI (e.g., in the "Problems" panel and as squiggly underlines in the editor).
 *
 * Responsibilities:
 * - `ShimDiagnosticsService` (implements `IExtHostDiagnostics` and the RPC shape `ExtHostDiagnosticsRpcShape`):
 *   - Provides the `createDiagnosticCollection(name?)` method, which is the entry point
 *     for extensions to create new diagnostic collections. Each collection is associated
 *     with a unique owner ID for distinguishing its diagnostics on the main thread.
 *   - Implements `getDiagnostics(resource?)`: Proxies a request to Mountain (via the
 *     `$getMany` RPC call) to fetch aggregated diagnostics for a given resource URI.
 *   - Manages and fires the `onDidChangeDiagnostics` event. This event signals that
 *     diagnostics for one or more resources have changed, typically triggered by an
 *     RPC call (`$acceptDiagnosticsChanged`) from Mountain.
 * - `ShimDiagnosticCollectionImpl` (implements `vscode.DiagnosticCollection`):
 *   - Provides the API for managing diagnostics within a specific collection (e.g., *     `set(uri, diagnostics)`, `delete(uri)`, `clear()`).
 *   - Converts `vscode.Diagnostic` objects (from the public API) into an internal
 *     `ILocalMarkerData`-like DTO format suitable for RPC. This conversion includes
 *     handling severities, ranges (0-based to 1-based), codes, related information, and tags.
 *   - Sends batches of diagnostic changes to Mountain via the `$changeMany` RPC call
 *     on `MainThreadDiagnosticsShape`.
 *   - Clears all diagnostics for its collection on the main thread via the `$clear` RPC call.
 *   - Provides local cache access methods (`get()`, `has()`, `forEach()`) for the
 *     diagnostics it manages.
 *   - Handles its own disposal, which includes notifying the main thread to clear
 *     diagnostics associated with its owner ID.
 *
 * Key Interactions:
 * - `ShimDiagnosticsService` is registered with Dependency Injection (DI) in `Cocoon/index.ts`
 *   as `IExtHostDiagnostics`.
 * - The `vscode.languages.createDiagnosticCollection` API (and related diagnostics features like
 *   `getDiagnostics` and `onDidChangeDiagnostics`), when exposed to extensions via the API
 *   factory, delegate their functionality to this service.
 * - All operations that modify or query persistent diagnostic state are proxied to
 *   `MainContext.MainThreadDiagnostics` on Mountain via RPC.
 * - Uses `BaseCocoonShim` for common utilities such as logging, RPC proxy management, *   and argument marshalling/revival.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
// For RPC DTOs related to URIs
import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
// VS Code internal types for markers, which diagnostics are converted to for the main thread.
import {
	// VS Code's internal enum
	MarkerSeverity as VscodeInternalMarkerSeverity,
	// VS Code's internal enum
	MarkerTag as VscodeInternalMarkerTag,
	// Assuming IMarkerData, MarkerSeverity, MarkerTag are available or accurately defined locally.
	// If importing from 'vs/platform/markers/common/markers':
	// Using ILocalMarkerData as a DTO, but VscodeInternalIMarkerData is the target structure.
	type IMarkerData as VscodeInternalIMarkerData,
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
	// API type
	Location as VscodeLocation,
	// API type
	Range as VscodeRange,
	// API type
	Uri as VscodeUri,
	type DiagnosticCollection,
	// For Diagnostic.tags, though not directly used in conversion here currently
	// ThemeColor,
} from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Local DTO and Enum Definitions for RPC Communication ---
// These DTOs should accurately mirror the structures expected by MainThreadDiagnostics
// and produced by this shim's conversion logic.

/** DTO for URI components sent over RPC. Should be compatible with VSCodeInternalUriComponents. */
interface ILocalUriComponents extends VSCodeInternalUriComponents {
	// The $mid property is often added by VS Code's marshallers (like `_convertApiArgToInternal`)
	// and is used by `vscodeRevive` on the receiving end.
}

/** DTO for individual diagnostic/marker data sent to MainThread. */
interface ILocalMarkerData {
	// Uses VS Code's internal MarkerSeverity enum values.
	severity: VscodeInternalMarkerSeverity;

	message: string;

	// 1-based line number.
	startLineNumber: number;

	// 1-based column number.
	startColumn: number;

	// 1-based line number.
	endLineNumber: number;

	// 1-based column number.
	endColumn: number;

	// Source of the diagnostic (e.g., "eslint", "typescript").
	source?: string;

	// Diagnostic code and optional target URI for the code.
	code?: string | { value: string; target: ILocalUriComponents };

	// Array of related diagnostic information.
	relatedInformation?: ILocalRelatedInformation[];

	// Array of tags (e.g., Unnecessary, Deprecated) using internal enum values.
	tags?: VscodeInternalMarkerTag[];

	// Note: `owner` (collection ID) and `resource` (URI of the document) are typically handled by
	// the `$changeMany` RPC call structure, not per markerData item.
}

/** DTO for related information within a diagnostic/marker. */
interface ILocalRelatedInformation {
	// URI DTO of the related information's location.
	resource: ILocalUriComponents;

	// Message for the related information.
	message: string;

	// 1-based.
	startLineNumber: number;

	// 1-based.
	startColumn: number;

	endLineNumber: number;

	endColumn: number;
}

/**
 * Defines the RPC interface for the `MainThreadDiagnostics` service expected on Mountain.
 */
interface MainThreadDiagnosticsShape {
	/**
	 * Applies diagnostic changes for multiple resources from a specific owner (collection).
	 * @param owner The unique identifier of the diagnostic collection.
	 * @param entries An array of tuples: `[uriComponents, markerDataArray | undefined]`.
	 *                Each tuple represents diagnostics for a single URI.
	 *                If `markerDataArray` is `undefined` or an empty array, all diagnostics
	 *                for that URI from this owner are effectively cleared.
	 */
	$changeMany(
		owner: string,

		entries: [ILocalUriComponents, ILocalMarkerData[] | undefined][],
	): Promise<void>;

	/**
	 * Clears all diagnostics from a specific owner (collection) across all resources.
	 * @param owner The unique identifier of the diagnostic collection to clear.
	 */
	$clear(owner: string): Promise<void>;

	/**
	 * Retrieves all markers (diagnostics) for a given resource URI, aggregated from all owners.
	 * @param resourceFilter Optional URI (as components) to filter diagnostics for.
	 *                       If undefined, Mountain might return all diagnostics (behavior TBD by Mountain).
	 * @returns A promise resolving to an array of `ILocalMarkerData` DTOs.
	 */
	$getMany(resourceFilter?: ILocalUriComponents): Promise<ILocalMarkerData[]>;
}

/**
 * Defines the RPC interface for this `ExtHostDiagnostics` service, for methods called BY Mountain.
 */
interface ExtHostDiagnosticsRpcShape {
	/**
	 * Called by Mountain to notify the extension host that diagnostics for certain URIs have changed.
	 * This typically triggers the `onDidChangeDiagnostics` event in this service.
	 * @param uris An array of URI components (DTOs) for which diagnostics have changed.
	 */
	$acceptDiagnosticsChanged(uris: ILocalUriComponents[]): void;
}

/** Represents the tuple structure for `DiagnosticCollection.set` entries. */
type DiagnosticEntryTuple = [
	VscodeUri,

	readonly Diagnostic[] | undefined | null,
];

/**
 * Cocoon's implementation of `vscode.DiagnosticCollection`.
 * Manages a set of diagnostics for a specific owner and synchronizes them with Mountain.
 */
class ShimDiagnosticCollectionImpl implements DiagnosticCollection {
	// The human-readable name of the collection.
	readonly #collectionName?: string;

	// Unique ID for this collection, used in RPC calls.
	readonly #ownerId: string;

	// RPC proxy.
	#mainThreadDiagnosticsProxy: MainThreadDiagnosticsShape | null;

	// Logger instance.
	#logService?: ILogServiceForShim;

	// Flag to track disposal state.
	#isDisposed = false;

	// Local cache of diagnostics: Map<uri.toString(), vscode.Diagnostic[]>.
	// Stores diagnostics as provided by the extension (using vscode.Diagnostic API type).
	readonly #diagnosticsCache = new Map<string, Diagnostic[]>();

	/**
	 * Creates an instance of ShimDiagnosticCollectionImpl.
	 * @param name The optional human-readable name of this collection (e.g., "eslint").
	 * @param ownerId A unique identifier for this collection, used to associate diagnostics with their source on the main thread.
	 * @param proxy The RPC proxy to `MainThreadDiagnostics` for communication with Mountain.
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

		this._logDebug(
			`Created collection. Name='${name || "(unnamed)"}', OwnerID='${this.#ownerId}'`,
		);
	}

	private _logDebug(message: string, ...args: any[]): void {
		this.#logService?.debug(
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
			// Fallback to console if no logger
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

	/** Throws an error if the collection has been disposed, preventing further operations. */
	private _validateNotDisposed(): void {
		if (this.#isDisposed) {
			throw new Error(
				`DiagnosticCollection '${this.#collectionName || this.#ownerId}' has been disposed and cannot be used.`,
			);
		}
	}

	/** {@inheritDoc vscode.DiagnosticCollection.name} */
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

		// Map to store URI strings to their corresponding ILocalMarkerData[] or undefined (to clear).
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
					"Skipping invalid URI in DiagnosticCollection.set(); URI must be an instance of vscode.Uri. Received:",

					uri,
				);

				return;
			}

			const uriString = uri.toString();

			let newDiagnosticsForUri: Diagnostic[] | undefined;

			if (diags === undefined || diags === null || diags.length === 0) {
				// If diagnostics are undefined, null, or empty, it means clear diagnostics for this URI.
				if (this.#diagnosticsCache.delete(uriString)) {
					// True if item existed and was deleted.
					// `undefined` in RPC means clear for this URI.
					entriesToSyncWithMainThread.set(uriString, undefined);
				}

				// If it didn't exist in cache and diags is empty/null, no change to send.
			} else {
				// Create a mutable copy for local cache.
				newDiagnosticsForUri = [...diags];

				this.#diagnosticsCache.set(uriString, newDiagnosticsForUri);

				try {
					const markerDataArray = newDiagnosticsForUri.map((d) =>
						this._convertDiagnosticToMarkerData(d),
					);

					entriesToSyncWithMainThread.set(uriString, markerDataArray);
				} catch (conversionError: any) {
					this._logError(
						`Error converting diagnostics to marker data for URI '${uriString}'. Diagnostics for this URI will not be synced. Error: ${conversionError.message}`,

						conversionError,
					);

					// Decide on recovery: should we attempt to clear on main thread or leave as is?
					// For safety, if conversion fails, perhaps don't send a "clear" either, to avoid unintended data loss if there were previous valid diagnostics.
				}
			}
		};

		// Handle overloaded signatures for set()
		if (firstParam instanceof VscodeUri) {
			processEntry(firstParam, diagnosticsOrUndefined);
		} else if (Array.isArray(firstParam)) {
			for (const [uri, diags] of firstParam) {
				processEntry(uri, diags);
			}
		} else {
			this._logError(
				"Invalid arguments passed to DiagnosticCollection.set(). Expected a URI and diagnostics, or an array of [URI, diagnostics] entries.",
			);

			return;
		}

		// If there are changes to sync and the RPC proxy is available.
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
					// Ensure it's a valid URI string before converting to DTO
					const parsedUriForRpc = VscodeUri.parse(uriStr);

					const uriDto = this._uriToComponentsDto(parsedUriForRpc);

					if (uriDto) {
						rpcEntries.push([uriDto, markerDataArray]);
					} else {
						this._logError(
							`Failed to convert URI string '${uriStr}' to DTO for RPC synchronization. Skipping sync for this URI.`,
						);
					}
				} catch (e: any) {
					// Catch errors from VscodeUri.parse or _uriToComponentsDto
					this._logError(
						`Error preparing URI '${uriStr}' for RPC synchronization: ${e.message}. Skipping sync for this URI.`,
					);
				}
			}

			if (rpcEntries.length > 0) {
				this._logDebug(
					`Sending ${rpcEntries.length} diagnostic change(s) to MainThread via $changeMany for owner '${this.#ownerId}'.`,
				);

				this.#mainThreadDiagnosticsProxy
					.$changeMany(this.#ownerId, rpcEntries)
					.catch((err) =>
						this._logError(
							`RPC call $changeMany failed for owner '${this.#ownerId}':`,

							refineErrorForShim(
								err,

								this.#logService,

								"$changeMany RPC",
							),
						),
					);
			}
		}

		// TODO: Notify the parent ShimDiagnosticsService about the changes for specific URIs if it manages an aggregated onDidChangeDiagnostics event.
		// E.g., this._diagnosticsServiceInstance.$notifyDiagnosticsChangedForOwner(this.#ownerId, Array.from(entriesToSyncWithMainThread.keys()).map(s => VscodeUri.parse(s)));
	}

	/** {@inheritDoc vscode.DiagnosticCollection.delete} */
	public delete(uri: VscodeUri): void {
		this._validateNotDisposed();

		if (!(uri instanceof VscodeUri)) {
			this._logError(
				"Invalid URI passed to DiagnosticCollection.delete(); URI must be an instance of vscode.Uri. Received:",

				uri,
			);

			return;
		}

		const uriString = uri.toString();

		if (this.#diagnosticsCache.delete(uriString)) {
			// True if the URI existed in the local cache and was deleted.
			this._logDebug(`Deleted diagnostics locally for URI: ${uriString}`);

			if (this.#mainThreadDiagnosticsProxy) {
				const uriDto = this._uriToComponentsDto(uri);

				if (uriDto) {
					this._logDebug(
						`Sending deletion request to MainThread for URI: ${uriString} (Owner: ${this.#ownerId})`,
					);

					// Sending `undefined` as the marker array for a URI in $changeMany signals a clear for that URI.
					this.#mainThreadDiagnosticsProxy
						.$changeMany(this.#ownerId, [[uriDto, undefined]])
						.catch((err) =>
							this._logError(
								`RPC $changeMany (for delete) failed on URI '${uriString}', Owner '${this.#ownerId}':`,

								refineErrorForShim(
									err,

									this.#logService,

									"delete RPC",
								),
							),
						);
				} else {
					this._logError(
						`Failed to convert URI '${uriString}' to DTO for delete RPC. Diagnostics on MainThread may persist for this URI.`,
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
			// Keep track if needed for event
			// const clearedUris = Array.from(this.#diagnosticsCache.keys());

			this._logDebug(
				`Clearing all ${this.#diagnosticsCache.size} URIs locally from collection '${this.#collectionName || this.#ownerId}'.`,
			);

			// Clear local cache.
			this.#diagnosticsCache.clear();

			if (this.#mainThreadDiagnosticsProxy) {
				this._logDebug(
					`Sending $clear request to MainThread for owner '${this.#ownerId}'.`,
				);

				this.#mainThreadDiagnosticsProxy
					.$clear(this.#ownerId)
					.catch((err) =>
						this._logError(
							`RPC $clear call failed for owner '${this.#ownerId}':`,

							refineErrorForShim(
								err,

								this.#logService,

								"clear RPC",
							),
						),
					);
			}

			// TODO: Notify parent service about changes for all URIs that were part of this collection.
		} else {
			this._logDebug(
				`clear() called for collection '${this.#collectionName || this.#ownerId}', but it was already empty locally.`,
			);
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
				// Convert cached URI string back to VscodeUri instance.
				uriInstance = VscodeUri.parse(uriString);
			} catch (e: any) {
				this._logError(
					`Error parsing cached URI string '${uriString}' in DiagnosticCollection.forEach. Skipping this entry. Error:`,

					e,
				);

				// Skip this entry if URI string is invalid.
				return;
			}

			try {
				// Provide a readonly, immutable copy of the diagnostics array to the callback, as per vscode.d.ts and good practice.
				callback.call(
					thisArg,

					uriInstance,

					Object.freeze([...diagnosticsArray]),

					this,
				);
			} catch (callbackError: any) {
				this._logError(
					`Error occurred in DiagnosticCollection.forEach callback execution for URI ${uriString}:`,

					callbackError,
				);

				// Standard behavior is to continue to the next item even if one callback fails.
			}
		});
	}

	/** {@inheritDoc vscode.DiagnosticCollection.get} */
	public get(uri: VscodeUri): readonly Diagnostic[] | undefined {
		this._validateNotDisposed();

		if (!(uri instanceof VscodeUri)) {
			this._logError(
				"Invalid URI passed to DiagnosticCollection.get(); URI must be an instance of vscode.Uri. Received:",

				uri,
			);

			return undefined;
		}

		const diagnosticsArray = this.#diagnosticsCache.get(uri.toString());

		// Return a readonly, immutable copy if diagnostics are found.
		return diagnosticsArray
			? Object.freeze([...diagnosticsArray])
			: undefined;
	}

	/** {@inheritDoc vscode.DiagnosticCollection.has} */
	public has(uri: VscodeUri): boolean {
		this._validateNotDisposed();

		if (!(uri instanceof VscodeUri)) {
			this._logError(
				"Invalid URI passed to DiagnosticCollection.has(); URI must be an instance of vscode.Uri. Received:",

				uri,
			);

			return false;
		}

		return this.#diagnosticsCache.has(uri.toString());
	}

	/** {@inheritDoc vscode.DiagnosticCollection.dispose} */
	public dispose(): void {
		if (!this.#isDisposed) {
			this._logDebug(
				`dispose() called for collection '${this.#collectionName || this.#ownerId}'. Clearing diagnostics and releasing resources.`,
			);

			this.#isDisposed = true;

			// This will clear local cache and send a $clear or $changeMany to MainThread.
			this.clear();

			// Release proxy reference to allow GC.
			this.#mainThreadDiagnosticsProxy = null;

			// Release logger reference.
			this.#logService = undefined;

			// Note: #diagnosticsCache is cleared by this.clear().
			// TODO: Notify ShimDiagnosticsService that this collection instance is disposed,

			// so it can be removed from any internal tracking if the service actively manages collection instances.
		}
	}

	/** Converts a `vscode.Uri` to `ILocalUriComponents` DTO for RPC, using `BaseCocoonShim._convertApiArgToInternal`. */
	private _uriToComponentsDto(
		uri: VscodeUri,
	): ILocalUriComponents | undefined {
		// Ensure `this` is correctly bound or `BaseCocoonShim` methods are accessible if ShimDiagnosticCollectionImpl doesn't extend it.
		// If ShimDiagnosticCollectionImpl does NOT extend BaseCocoonShim, this call needs to be through an instance of BaseCocoonShim.
		// Assuming ShimDiagnosticCollectionImpl has access to a BaseCocoonShim instance or its methods, e.g., if parent service passes it.
		// For this structure, ShimDiagnosticCollectionImpl doesn't extend BaseCocoonShim directly.
		// This method might need to be static on BaseCocoonShim or called via the parent ShimDiagnosticsService instance.
		// For now, assuming `(this as any as BaseCocoonShim)` is a temporary workaround for access if this class were part of a larger structure.
		// A better way: pass the marshaller function from parent. For now, we'll assume it's accessible:
		const baseShimInstance = // Risky, for demonstration.
			(this as any).__proto__.__proto__ as BaseCocoonShim;

		if (
			!baseShimInstance ||
			typeof baseShimInstance._convertApiArgToInternal !== "function"
		) {
			this._logError(
				"FATAL: _uriToComponentsDto cannot access BaseCocoonShim._convertApiArgToInternal. URI marshalling will fail.",
			);

			// Fallback to a manual, less robust conversion if BaseCocoonShim is inaccessible.
			return {
				scheme: uri.scheme,

				authority: uri.authority,

				path: uri.path,

				query: uri.query,

				fragment: uri.fragment,
			} as ILocalUriComponents;
		}

		const components = baseShimInstance._convertApiArgToInternal(uri);

		// Check if the result from _convertApiArgToInternal is a valid DTO with $mid or basic components.
		if (
			components &&
			(components.$mid === 1 /* MarshalledId.UriSimple */ ||
				(components.scheme && components.path !== undefined))
		) {
			return components as ILocalUriComponents;
		}

		this._logError(
			"Failed to convert VscodeUri to ILocalUriComponents DTO for RPC. Base marshaller returned unexpected structure.",

			"Input URI:",

			uri,

			"Marshalled Output:",

			components,
		);

		return undefined;
	}

	/** Converts a `vscode.Diagnostic` object to an `ILocalMarkerData` DTO for RPC. */
	private _convertDiagnosticToMarkerData(diag: Diagnostic): ILocalMarkerData {
		if (!(diag.range instanceof VscodeRange)) {
			this._logError(
				"Diagnostic is missing a valid 'range' (instance of vscode.Range). Defaulting to line 1, char 1.",

				diag,
			);

			// Create a default range to prevent crashes, although this indicates an issue with the diagnostic source.
			// Line 0, Char 0 to Line 0, Char 0
			diag.range = new VscodeRange(0, 0, 0, 0);
		}

		const severity = (): VscodeInternalMarkerSeverity => {
			switch (diag.severity) {
				case DiagnosticSeverity.Error:
					return VscodeInternalMarkerSeverity.Error;

				case DiagnosticSeverity.Warning:
					return VscodeInternalMarkerSeverity.Warning;

				case DiagnosticSeverity.Information:
					return VscodeInternalMarkerSeverity.Info;

				case DiagnosticSeverity.Hint:
					return VscodeInternalMarkerSeverity.Hint;

				default:
					this._logWarn(
						`Unknown vscode.DiagnosticSeverity value: ${diag.severity}. Defaulting to VscodeInternalMarkerSeverity.Error.`,
					);

					return VscodeInternalMarkerSeverity.Error;
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
				// Recursively convert URI
				const targetUriDto = this._uriToComponentsDto(diag.code.target);

				if (targetUriDto) {
					markerCodeDto = {
						value: String(diag.code.value),

						target: targetUriDto,
					};
				} else {
					this._logWarn(
						"Failed to convert target URI in diagnostic.code to DTO. Storing code value only.",

						"Diagnostic Code:",

						diag.code,
					);

					// Fallback: store only the value part.
					markerCodeDto = String(diag.code.value);
				}
			} else if (typeof diag.code === "object") {
				// For older { value: string | number; target: string_uri_deprecated }

				markerCodeDto = String(diag.code.value);
			} else {
				// Primitive string or number
				markerCodeDto = String(diag.code);
			}
		}

		const relatedInformationDto = diag.relatedInformation
			?.map((ri) => {
				if (
					!(ri.location instanceof VscodeLocation) ||
					!(ri.location.uri instanceof VscodeUri) ||
					!(ri.location.range instanceof VscodeRange)
				) {
					this._logWarn(
						"Skipping invalid DiagnosticRelatedInformation item due to malformed location/uri/range.",

						ri,
					);

					return undefined;
				}

				const resourceDto = this._uriToComponentsDto(ri.location.uri);

				if (!resourceDto) {
					this._logWarn(
						"Failed to convert URI for relatedInformation to DTO. Skipping this relatedInformation item.",

						"URI:",

						ri.location.uri,
					);

					// Skip this item if URI conversion fails.
					return undefined;
				}

				return {
					resource: resourceDto,

					message: ri.message,

					// Convert 0-based (API) to 1-based (DTO)
					startLineNumber: ri.location.range.start.line + 1,

					startColumn: ri.location.range.start.character + 1,

					endLineNumber: ri.location.range.end.line + 1,

					endColumn: ri.location.range.end.character + 1,
				};
			})
			.filter((ri) => ri !== undefined) as
			| ILocalRelatedInformation[]
			// Filter out undefined items
			| undefined;

		const tagsDto = diag.tags
			?.map((apiTagValue) => {
				// `apiTagValue` is `vscode.DiagnosticTag` (numeric enum)
				if (apiTagValue === DiagnosticTag.Unnecessary)
					return VscodeInternalMarkerTag.Unnecessary;

				if (apiTagValue === DiagnosticTag.Deprecated)
					return VscodeInternalMarkerTag.Deprecated;

				// TODO: Map other DiagnosticTags if VS Code API adds more that correspond to VscodeInternalMarkerTag values.
				this._logWarn(
					`Unsupported vscode.DiagnosticTag value: ${apiTagValue}. Omitting this tag from DTO.`,
				);

				return undefined;
			})
			.filter((t) => t !== undefined) as
			| VscodeInternalMarkerTag[]
			// Filter out undefined tags
			| undefined;

		return {
			severity: severity(),

			// Ensure message is a string, default to empty if null/undefined.
			message: diag.message || "",

			// API Range is 0-based, IMarkerData DTO is 1-based.
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
 * Cocoon's implementation of `IExtHostDiagnostics` (and `ExtHostDiagnosticsRpcShape`).
 * Manages diagnostic collections and handles aggregation and events for diagnostics.
 */
export class ShimDiagnosticsService
	extends BaseCocoonShim
	implements ExtHostDiagnosticsRpcShape
{
	// For IExtHostDiagnostics DI registration.
	public readonly _serviceBrand: undefined;

	#mainThreadDiagnosticsProxy: MainThreadDiagnosticsShape | null = null;

	// To generate unique owner IDs for diagnostic collections.
	#collectionOwnerCounter = 0;

	readonly #onDidChangeDiagnosticsEmitter = new VscodeEmitter<
		readonly VscodeUri[]
	>();

	public readonly onDidChangeDiagnostics: VscodeEvent<readonly VscodeUri[]> =
		this.#onDidChangeDiagnosticsEmitter.event;

	/**
	 * Creates an instance of ShimDiagnosticsService.
	 * @param rpcService The RPC service adapter for communication with MainThreadDiagnostics.
	 * @param logService The logging service instance.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostDiagnostics", rpcService, logService);

		// Use Info for major lifecycle events
		this._logInfo("Initialized.");

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
				"Failed to obtain MainThreadDiagnostics RPC proxy. Diagnostic collections will not sync effectively with Mountain, and getDiagnostics will fail.",
			);
		}
	}

	/**
	 * {@inheritDoc vscode.languages.createDiagnosticCollection}
	 *
	 * Creates a new diagnostic collection with an optional human-readable name.
	 * @param name Optional name for the collection (e.g., "eslint", "typescript").
	 * @returns A `vscode.DiagnosticCollection` instance.
	 */
	public createDiagnosticCollection(name?: string): DiagnosticCollection {
		this._logDebug(
			`API createDiagnosticCollection called: Name='${name || "(unnamed)"}'`,
		);

		if (!this.#mainThreadDiagnosticsProxy) {
			this._logError(
				`Cannot create DiagnosticCollection '${name || "(unnamed)"}': MainThreadDiagnostics RPC proxy is unavailable. Returning a NOP (No-Operation) collection. Diagnostics from this collection will not be displayed.`,
			);

			return this._createNopDiagnosticCollection(name);
		}

		// Generate a unique owner ID for this collection for MainThread tracking.
		const ownerId = `cocoon_diag_owner_${this.#collectionOwnerCounter++}_${name || "anonymous"}`;

		this._logDebug(
			`Assigning OwnerID='${ownerId}' to new diagnostic collection '${name || "(unnamed)"}'.`,
		);

		// Pass `this` (ShimDiagnosticsService) or a relevant part of it if ShimDiagnosticCollectionImpl
		// needs to call back to the parent service (e.g., for _uriToComponentsDto or event firing).
		// For now, _uriToComponentsDto is called unsafely.
		return new ShimDiagnosticCollectionImpl(
			name,

			ownerId,

			this.#mainThreadDiagnosticsProxy,

			this._logService,
		);
	}

	/** Creates a NOP (No-Operation) DiagnosticCollection for fallback scenarios. */
	private _createNopDiagnosticCollection(
		name?: string,
	): DiagnosticCollection {
		this._logWarn(
			`Creating NOP (No-Operation) DiagnosticCollection: Name='${name || "(unnamed)"}' due to unavailable RPC proxy. This collection will not function.`,
		);

		return Object.freeze({
			// Ensure immutability for NOP object
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
	 * {@inheritDoc vscode.languages.getDiagnostics}
	 *
	 * Retrieves all diagnostics for a given resource, aggregated from all collections by Mountain.
	 * @param resource Optional URI of the resource to get diagnostics for. If undefined,
	 *
	 *
	 *                 behavior depends on Mountain's `$getMany` implementation (might return all known diagnostics).
	 * @returns A promise resolving to a readonly array of `vscode.Diagnostic` objects.
	 */
	public async getDiagnostics(
		resource?: VscodeUri,
	): Promise<readonly Diagnostic[]> {
		const resourceForLog = resource
			? resource.toString()
			: "(all resources, if supported by MainThread)";

		this._logDebug(
			`API getDiagnostics called for resource: ${resourceForLog}`,
		);

		if (!this.#mainThreadDiagnosticsProxy?.$getMany) {
			this._logError(
				"Cannot getDiagnostics: MainThreadDiagnosticsProxy.$getMany is not available or proxy is null. Returning an empty array.",
			);

			return Object.freeze([]);
		}

		try {
			// Convert VscodeApiUri to ILocalUriComponents DTO for RPC
			const resourceFilterDto = resource
				? (this._convertApiArgToInternal(
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

				refineErrorForShim(e, this._logService, "getDiagnostics RPC"),
			);

			// Return empty array on error.
			return Object.freeze([]);
		}
	}

	// --- RPC Method called BY MainThread (ExtHostDiagnosticsRpcShape) ---
	/**
	 * {@inheritDoc ExtHostDiagnosticsRpcShape.$acceptDiagnosticsChanged}
	 *
	 * Called by Mountain to notify that diagnostics for specified URIs have changed.
	 * This triggers the `onDidChangeDiagnostics` event in this service.
	 * @param uriComponentsArray An array of URI components (DTOs) for affected resources.
	 */
	public $acceptDiagnosticsChanged(
		uriComponentsArray: ILocalUriComponents[],
	): void {
		this._logDebug(
			`RPC $acceptDiagnosticsChanged received for ${uriComponentsArray.length} URIs.`,
		);

		const changedVscodeUris: VscodeUri[] = [];

		for (const uriComp of uriComponentsArray) {
			try {
				// Revive URI DTO from MainThread to VscodeApiUri
				const revivedUri = this._reviveApiArgument<VscodeUri>(uriComp);

				if (revivedUri instanceof VscodeUri) {
					changedVscodeUris.push(revivedUri);
				} else {
					this._logWarn(
						"$acceptDiagnosticsChanged: Failed to revive URI component from MainThread notification. This URI will not be included in the event.",

						"Received DTO:",

						uriComp,
					);
				}
			} catch (e: any) {
				this._logError(
					"$acceptDiagnosticsChanged: Error reviving URI component during notification processing. This URI will be skipped.",

					"Received DTO:",

					uriComp,

					"Error:",

					e,
				);
			}
		}

		if (changedVscodeUris.length > 0) {
			this.#onDidChangeDiagnosticsEmitter.fire(
				Object.freeze(changedVscodeUris),

				// Ensure event payload is immutable
			);

			this._logDebug(
				`Fired onDidChangeDiagnostics event for ${changedVscodeUris.length} URIs.`,
			);
		}
	}

	/** Converts an array of `ILocalMarkerData` DTOs (from MainThread) to an array of `vscode.Diagnostic` objects (API type). */
	private _convertMarkersArrayToDiagnosticsArray(
		markersDataArray: ILocalMarkerData[],
	): Diagnostic[] {
		return markersDataArray.map((markerData) => {
			// Convert 1-based DTO line/column numbers to 0-based for vscode.Range (API type)
			const range = new VscodeRange(
				markerData.startLineNumber - 1,

				markerData.startColumn - 1,

				markerData.endLineNumber - 1,

				markerData.endColumn - 1,
			);

			// API enum
			let severity: DiagnosticSeverity;

			switch (
				// `markerData.severity` is VscodeInternalMarkerSeverity
				markerData.severity
			) {
				case VscodeInternalMarkerSeverity.Error:
					severity = DiagnosticSeverity.Error;

					break;

				case VscodeInternalMarkerSeverity.Warning:
					severity = DiagnosticSeverity.Warning;

					break;

				case VscodeInternalMarkerSeverity.Info:
					severity = DiagnosticSeverity.Information;

					break;

				case VscodeInternalMarkerSeverity.Hint:
					severity = DiagnosticSeverity.Hint;

					break;

				default:
					this._logWarn(
						"Unknown VscodeInternalMarkerSeverity value received from MainThread:",

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

			// Revive diagnostic.code (which can be string or { value: string, target: Uri })
			if (typeof markerData.code === "string") {
				diagnostic.code = markerData.code;
			} else if (markerData.code && typeof markerData.code === "object") {
				// DTO is { value: string; target: ILocalUriComponents }

				const targetUri = this._reviveApiArgument<VscodeUri>(
					markerData.code.target,

					// Revive DTO to VscodeApiUri
				);

				if (targetUri instanceof VscodeUri) {
					diagnostic.code = {
						value: markerData.code.value,

						target: targetUri,
					};
				} else {
					this._logWarn(
						"Failed to revive target URI for diagnostic.code from MainThread DTO. Storing code value only.",

						"Code DTO target:",

						markerData.code.target,
					);

					// Fallback to just the value part.
					diagnostic.code = markerData.code.value;
				}
			}

			// Revive relatedInformation
			if (markerData.relatedInformation) {
				diagnostic.relatedInformation = markerData.relatedInformation
					.map((riDto) => {
						const locUri = this._reviveApiArgument<VscodeUri>(
							riDto.resource,

							// Revive DTO to VscodeApiUri
						);

						if (!(locUri instanceof VscodeUri)) {
							this._logWarn(
								"Failed to revive URI for relatedInformation from MainThread DTO. Skipping this relatedInformation item.",

								"RelatedInfo DTO resource:",

								riDto.resource,
							);

							// Skip this item if URI revival fails.
							return null;
						}

						// Convert 1-based DTO to 0-based API Range
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

						// Filter out skipped items
					) as DiagnosticRelatedInformation[];
			}

			// Revive tags
			if (markerData.tags) {
				diagnostic.tags = markerData.tags
					.map((internalTagValue) => {
						// `internalTagValue` is `VscodeInternalMarkerTag`
						if (
							internalTagValue ===
							VscodeInternalMarkerTag.Unnecessary
						)
							return DiagnosticTag.Unnecessary;

						if (
							internalTagValue ===
							VscodeInternalMarkerTag.Deprecated
						)
							return DiagnosticTag.Deprecated;

						// TODO: Map other VscodeInternalMarkerTag values if they correspond to public DiagnosticTag values.
						this._logWarn(
							"Unknown VscodeInternalMarkerTag value received from MainThread:",

							internalTagValue,

							"Omitting this tag.",
						);

						return undefined;
					})
					// Filter out unmapped tags
					.filter((t) => t !== undefined) as DiagnosticTag[];
			}

			return diagnostic;
		});
	}

	/**
	 * Disposes of resources held by this shim instance, such as event emitters.
	 */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables
		super.dispose();

		this.#onDidChangeDiagnosticsEmitter.dispose();

		this._logInfo("Disposed.");
	}
}
