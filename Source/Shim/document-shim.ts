/*---------------------------------------------------------------------------------------------
 * Cocoon Document Shim Service (document-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtHostDocumentsAndEditors` service interface, with a primary focus on
 * the `IExtHostDocuments` aspects relevant to Cocoon's operation. This service is
 * responsible for managing `TextDocument` data instances, which represent open text
 * documents within the Cocoon extension host environment. It synchronizes the state
 * of these documents (content, version, language, dirty status, etc.) with the
 * Mountain host process (main process).
 *
 * Core Components:
 * - `CocoonDocumentService`:
 *   - Manages a collection of `CocoonDocumentData` instances, keyed by document URI strings.
 *   - Provides internal API methods like `getDocumentData(uri)` for other shims, and
 *     `getTextDocuments()` which backs `vscode.workspace.textDocuments`.
 *   - Exposes `vscode.workspace` document lifecycle events (e.g., `onDidOpenTextDocument`, *     `onDidChangeTextDocument`) by firing its internal `VscodeEmitter` instances.
 *   - Implements RPC methods defined in `ExtHostDocumentsShape` (from `extHost.protocol.ts`).
 *     These methods (e.g., `$acceptModelAdded`, `$acceptModelRemoved`, `$acceptModelChanged`)
 *     are invoked by the MainThread (Mountain) to push document state updates to Cocoon.
 *
 * - `CocoonDocumentData`:
 *   - Represents the state of a single text document, including its URI, lines of text, *     version ID, language identifier, dirty status, end-of-line sequence, and encoding.
 *   - Provides the actual `vscode.TextDocument` API facade that extensions interact with.
 *     This facade is carefully constructed to be read-only where appropriate and to
 *     delegate operations like `save()` correctly.
 *   - Contains the logic for applying content changes (`_acceptContentChangesInternal`)
 *     received from the MainThread, ensuring the local model accurately reflects the editor's state.
 *   - Its `save()` method proxies the save operation to the MainThread via an RPC call
 *     (`$trySaveDocument` on `MainThreadDocumentsShape`).
 *
 * Key Interactions:
 * - An instance of `CocoonDocumentService` is registered with Dependency Injection (DI)
 *   in `Cocoon/index.ts` as `IExtHostDocuments` and `IExtHostDocumentsAndEditors`.
 * - Its `getTextDocuments()` method and document lifecycle events are exposed to extensions
 *   via the `vscode.workspace` API object (typically through an intermediary
 *   `ShimExtHostWorkspace` service).
 * - Receives document state updates from Mountain's `MainThreadDocuments` service via RPC.
 * - Makes RPC calls to Mountain's `MainThreadDocuments` service for operations like saving.
 * - Utilizes VS Code internal types (e.g., `VSCodeInternalURI`, `IRange` DTO) and utility
 *   functions (e.g., `splitLines`, `ensureValidWordDefinition`) where appropriate, *   adapting them for the Cocoon shim environment.
 * - Relies on `BaseCocoonShim` for common utilities such as logging, RPC proxy management, *   and argument marshalling/revival.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable, dispose, IDisposable } from "vs/base/common/lifecycle";
import { MarshalledId } from "vs/base/common/marshalling";
import { Schemas } from "vs/base/common/network";
// For consistent line splitting when applying edits
import { splitLines } from "vs/base/common/strings";
import {
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
// Used for DTOs; IRange from extHost.protocol.ts is 0-based for line/column.
import type { IRange as VSCodeInternalIRange } from "vs/editor/common/core/range";
import {
	// Renamed for clarity
	DEFAULT_WORD_REGEXP as DEFAULT_WORD_REGEXP_IMPORTED,
	// Renamed
	ensureValidWordDefinition as ensureValidWordDefinitionImported,
	// VS Code's internal helper
	getWordAtText as getWordAtTextInternal,
} from "vs/editor/common/core/wordHelper";
import {
	ExtHostContext,
	MainContext,
	// DTO for model change events
	type IModelChangedEventData as RpcModelChangedEvent,
	// DTO for a single content change
	type IModelContentChange as RpcModelContentChange,
	// RPC shape this service implements
	type ExtHostDocumentsShape as VscodeExtHostDocumentsShape,
	// RPC shape for MainThread proxy
	type MainThreadDocumentsShape as VscodeMainThreadDocumentsShape,
} from "vs/workbench/api/common/extHost.protocol";
// vscode API types from the local shim bundle
import {
	TextDocumentChangeReason,
	// Public API URI type
	Uri as VscodeApiUri,
	EndOfLine as VscodeEndOfLine,
	Position as VscodePosition,
	Range as VscodeRange,
	type TextDocument as VscodeTextDocument,
	type TextDocumentChangeEvent as VscodeTextDocumentChangeEvent,
	type TextDocumentContentChangeEvent as VscodeTextDocumentContentChangeEvent,
	type TextLine as VscodeTextLine,
} from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// Fallback for word definition regex if VS Code's internal isn't suitable or available.
const DEFAULT_WORD_REGEXP_FALLBACK =
	/(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;

// Ensure `ensureValidWordDefinitionInternal` is a non-null function.
// This pattern allows using VS Code's imported helper if available, otherwise uses a fallback.
let ensureValidWordDefinition: (wordDefinition?: RegExp) => RegExp =
	ensureValidWordDefinitionImported;

if (!ensureValidWordDefinition) {
	ensureValidWordDefinition = (wordDefinition?: RegExp): RegExp => {
		let result: RegExp = DEFAULT_WORD_REGEXP_FALLBACK;

		if (wordDefinition instanceof RegExp) {
			if (!wordDefinition.global) {
				// Ensure the global flag is set for iterative matching (e.g., in getWordRangeAtPosition)
				let flags = "g";

				if (wordDefinition.ignoreCase) flags += "i";

				if (wordDefinition.multiline) flags += "m";

				if (wordDefinition.unicode) flags += "u";

				// Add other flags like sticky 'y' or dotAll 's' if necessary for full compatibility
				result = new RegExp(wordDefinition.source, flags);
			} else {
				result = wordDefinition;
			}
		}

		// Important: Reset lastIndex before each use if the regex instance is reused.
		result.lastIndex = 0;

		return result;
	};
}

/**
 * Local type converters, primarily for Ranges from DTOs to API types.
 * In a full VS Code `ExtHost`, these are more comprehensive.
 * This simplified version focuses on `IRange` DTO to `vscode.Range`.
 */
const localTypeConverters = {
	Range: {
		/**
		 * Converts an `IRange` DTO (which is 0-based for line and column numbers,
		 *
		 *
		 * as typically received over RPC for model changes in `RpcModelContentChange.range`)
		 * to a `vscode.Range` object (which also expects 0-based line/column).
		 * @param rangeDto The IRange DTO from `extHost.protocol.ts`.
		 * @returns A `vscode.Range` object.
		 */
		toApiRange: (
			rangeDto: VSCodeInternalIRange | undefined,
		): VscodeRange => {
			if (!rangeDto) {
				// Default to an empty range at (0,0) for safety if DTO is undefined or malformed.
				// This might occur if a change event is incomplete.
				console.warn(
					"[DocumentShim TypeConverter] Range DTO is undefined, defaulting to empty range at (0,0).",
				);

				return new VscodeRange(0, 0, 0, 0);
			}

			// `VSCodeInternalIRange` from `extHost.protocol.ts` is defined as:
			// { startLineNumber, startColumn, endLineNumber, endColumn }

			// These are 0-based, matching the `vscode.Range` constructor.
			return new VscodeRange(
				rangeDto.startLineNumber,

				rangeDto.startColumn,

				rangeDto.endLineNumber,

				rangeDto.endColumn,
			);
		},
	},
};

// --- Type Definitions ---

/**
 * Defines the subset of the `MainThreadDocuments` RPC interface relevant to this document shim.
 * This includes methods for trying to create, open, or save documents on the main thread.
 */
type MainThreadDocumentsProxyService = Pick<
	VscodeMainThreadDocumentsShape,
	"$tryCreateDocument" | "$tryOpenDocument" | "$trySaveDocument"
>;

/**
 * `CocoonDocumentService` manages text document data (`CocoonDocumentData` instances)
 * and provides document-related APIs (e.g., `vscode.workspace.textDocuments`) and events.
 * It implements `VscodeExtHostDocumentsShape` to receive document state updates from the MainThread.
 */
export class CocoonDocumentService
	extends BaseCocoonShim
	implements VscodeExtHostDocumentsShape
{
	// For IExtHostDocuments/IExtHostDocumentsAndEditors DI
	public readonly _serviceBrand: undefined;

	readonly #mainThreadDocumentsProxy: MainThreadDocumentsProxyService | null =
		null;

	// Document cache: Key is VscodeApiUri.toString(), Value is CocoonDocumentData instance.
	readonly #documents = new Map<string, CocoonDocumentData>();

	// Event Emitters for vscode.workspace document events
	readonly #onDidAddDocumentEmitter = new VscodeEmitter<VscodeTextDocument>();

	readonly #onDidRemoveDocumentEmitter =
		new VscodeEmitter<VscodeTextDocument>();

	readonly #onDidChangeDocumentEmitter =
		new VscodeEmitter<VscodeTextDocumentChangeEvent>();

	readonly #onDidSaveDocumentEmitter =
		new VscodeEmitter<VscodeTextDocument>();

	/**
	 * Creates an instance of CocoonDocumentService.
	 * @param rpcService The RPC service adapter for communication with MainThreadDocuments.
	 * @param logService The logging service instance.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		// Service ID for logging
		super("ExtHostDocuments", rpcService, logService);

		// Use Info for major lifecycle events
		this._logInfo("Initializing...");

		if (this._rpcService) {
			this.#mainThreadDocumentsProxy = this._getProxy(
				MainContext.MainThreadDocuments as ProxyIdentifier<MainThreadDocumentsProxyService>,
			);

			// Register self to handle RPC calls from MainThreadDocuments.
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostDocuments as ProxyIdentifier<VscodeExtHostDocumentsShape>,

					this,
				);

				this._logInfo(
					"Registered self for incoming RPC calls (ExtHostDocuments).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to register self as RPC target for ExtHostDocuments:",

					e,
				);
			}
		}

		if (!this.#mainThreadDocumentsProxy) {
			this._logError(
				"MainThreadDocuments RPC proxy NOT obtained. Document operations (save, create, open) will fail or be impaired.",
			);
		}
	}

	/** Provides access to the MainThreadDocuments RPC proxy, primarily for use by `CocoonDocumentData` (e.g., for saving). */
	public getMainThreadDocumentsProxy(): MainThreadDocumentsProxyService | null {
		return this.#mainThreadDocumentsProxy;
	}

	// --- Internal API for other ExtHost services ---
	/**
	 * Retrieves the `CocoonDocumentData` instance for a given URI.
	 * This is typically used by other shims that need internal access to document state.
	 * @param uri The `vscode.Uri` (public API type) of the document.
	 * @returns The `CocoonDocumentData` instance, or `undefined` if no document with that URI is managed.
	 */
	public getDocumentData(uri: VscodeApiUri): CocoonDocumentData | undefined {
		if (!(uri instanceof VscodeApiUri)) {
			// Ensure input is of the expected API type
			this._logWarn(
				"getDocumentData called with an invalid URI type (expected vscode.Uri). Received:",

				uri,
			);

			return undefined;
		}

		return this.#documents.get(uri.toString());
	}

	/**
	 * Retrieves all managed `CocoonDocumentData` instances.
	 * @returns A readonly array of all `CocoonDocumentData` instances.
	 */
	public getAllDocumentData(): readonly CocoonDocumentData[] {
		return Object.freeze([...this.#documents.values()]);
	}

	// --- vscode.workspace API parts (exposed via ShimExtHostWorkspace or equivalent) ---
	/**
	 * Gets all currently known text documents. This backs `vscode.workspace.textDocuments`.
	 * @returns A readonly array of `vscode.TextDocument` API objects.
	 */
	public getTextDocuments(): readonly VscodeTextDocument[] {
		return this.getAllDocumentData().map((docData) => docData.document);
	}

	public readonly onDidOpenTextDocument: VscodeEvent<VscodeTextDocument> =
		this.#onDidAddDocumentEmitter.event;

	public readonly onDidCloseTextDocument: VscodeEvent<VscodeTextDocument> =
		this.#onDidRemoveDocumentEmitter.event;

	public readonly onDidChangeTextDocument: VscodeEvent<VscodeTextDocumentChangeEvent> =
		this.#onDidChangeDocumentEmitter.event;

	public readonly onDidSaveTextDocument: VscodeEvent<VscodeTextDocument> =
		this.#onDidSaveDocumentEmitter.event;

	// --- RPC Methods ($accept... from VscodeExtHostDocumentsShape, called BY MainThread) ---

	/** {@inheritDoc VscodeExtHostDocumentsShape.$acceptModelAdded} */
	public $acceptModelAdded(
		// DTO from MainThread
		uriComponents: VSCodeInternalUriComponents,

		eol: string,

		versionId: number,

		lines: string[],

		languageId: string,

		isDirty: boolean,

		// VS Code's standard RpcModelAddedData does not include encoding.
		// If Cocoon's protocol adds it, type here should match. For now, mark as potentially unused.
		_encoding_unused?: string,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptModelAdded: Failed to revive URI from DTO. Document cannot be added.",

				"Received DTO:",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		if (this.#documents.has(uriString)) {
			this._logWarn(
				`$acceptModelAdded: Document with URI '${uriString}' already exists in cache. Ignoring 'add' notification. This might indicate a sync issue or redundant call from MainThread.`,
			);

			return;
		}

		this._logDebug(
			`$acceptModelAdded: URI='${uriString}', Version=${versionId}, Lang='${languageId}', Dirty=${isDirty}, Lines=${lines.length}`,
		);

		const documentData = new CocoonDocumentData(
			// Pass this service instance for operations like save
			this,

			revivedVscodeApiUri,

			lines,

			eol,

			languageId,

			versionId,

			isDirty,

			// Default encoding if not provided by protocol. `_encoding_unused` could be used here if protocol changes.
			"utf8",

			this._logService,
		);

		this.#documents.set(uriString, documentData);

		this.#onDidAddDocumentEmitter.fire(documentData.document);
	}

	/** {@inheritDoc VscodeExtHostDocumentsShape.$acceptModelRemoved} */
	public $acceptModelRemoved(
		uriComponents: VSCodeInternalUriComponents,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptModelRemoved: Failed to revive URI from DTO. Document cannot be removed by this DTO.",

				"Received DTO:",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		const documentData = this.#documents.get(uriString);

		if (documentData) {
			this._logDebug(`$acceptModelRemoved: URI='${uriString}'`);

			// Mark internal state as closed for `document.isClosed`
			documentData._markAsClosedInternal();

			// Remove from cache
			this.#documents.delete(uriString);

			// Fire event
			this.#onDidRemoveDocumentEmitter.fire(documentData.document);

			// Dispose the CocoonDocumentData instance itself to clean up its resources
			dispose(documentData);
		} else {
			this._logWarn(
				`$acceptModelRemoved: Document with URI '${uriString}' not found in local cache. Cannot remove.`,
			);
		}
	}

	/** {@inheritDoc VscodeExtHostDocumentsShape.$acceptModelChanged} */
	public $acceptModelChanged(
		uriComponents: VSCodeInternalUriComponents,

		eventData: RpcModelChangedEvent,

		isDirty: boolean,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptModelChanged: Failed to revive URI from DTO. Document changes cannot be applied.",

				"Received DTO:",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		const documentData = this.#documents.get(uriString);

		if (documentData) {
			// Version check: Apply changes only if the event's version ID is newer or -1 (force override).
			// Standard VS Code behavior: stale events are ignored for content, but dirty state might still update.
			if (
				documentData.version >= eventData.versionId &&
				eventData.versionId !== -1
			) {
				this._logWarn(
					`$acceptModelChanged: Stale event (V${eventData.versionId}) for URI '${uriString}' (current V${documentData.version}). Content changes ignored. Applying dirty state update only.`,
				);

				// Still update dirty flag as per VS Code logic
				documentData._acceptIsDirtyInternal(isDirty);

				return;
			}

			this._logDebug(
				`$acceptModelChanged: URI='${uriString}', NewVersion=${eventData.versionId}, Changes=${eventData.changes.length}, NewEOL='${eventData.eol}', IsDirty=${isDirty}`,
			);

			const contentChanged = documentData._acceptContentChangesInternal(
				eventData.versionId,

				eventData.changes,

				eventData.eol,
			);

			const dirtinessChanged =
				documentData._acceptIsDirtyInternal(isDirty);

			if (!contentChanged && !dirtinessChanged) {
				this._logDebug(
					`$acceptModelChanged: No effective content or dirtiness change applied for URI '${uriString}', V${eventData.versionId}. No event fired.`,
				);

				// No actual change to content or dirty state that needs an event.
				return;
			}

			// If content changed, fire the onDidChangeTextDocument event.
			// The API expects an array of VscodeTextDocumentContentChangeEvent.
			if (contentChanged) {
				const vscodeContentChanges: VscodeTextDocumentContentChangeEvent[] =
					eventData.changes.map((change) => ({
						// RpcModelContentChange.range is an IRange DTO (0-based). Convert to vscode.Range.
						range: localTypeConverters.Range.toApiRange(
							change.range,
						),

						// Typically 0 if range is supplied
						rangeOffset: change.rangeOffset,

						// Length of text replaced by `change.text`
						rangeLength: change.rangeLength,

						text: change.text,
					}));

				this.#onDidChangeDocumentEmitter.fire(
					Object.freeze({
						document: documentData.document,

						contentChanges: Object.freeze(
							vscodeContentChanges,
						) as readonly VscodeTextDocumentContentChangeEvent[],

						reason: eventData.isUndoing
							? TextDocumentChangeReason.Undo
							: eventData.isRedoing
								? TextDocumentChangeReason.Redo
								: // Reason is optional, undefined if not undo/redo.
									undefined,
					}),
				);
			} else if (dirtinessChanged) {
				// If only dirtiness changed (no content change), VS Code still fires onDidChangeTextDocument with empty contentChanges.
				this.#onDidChangeDocumentEmitter.fire(
					Object.freeze({
						document: documentData.document,

						contentChanges: Object.freeze(
							[],
						) as readonly VscodeTextDocumentContentChangeEvent[],

						reason: undefined,
					}),
				);
			}
		} else {
			this._logWarn(
				`$acceptModelChanged: Document with URI '${uriString}' not found in local cache. Cannot apply changes.`,
			);
		}
	}

	/** {@inheritDoc VscodeExtHostDocumentsShape.$acceptModelSaved} */
	public $acceptModelSaved(uriComponents: VSCodeInternalUriComponents): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptModelSaved: Failed to revive URI from DTO. Save event cannot be processed.",

				"Received DTO:",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		const documentData = this.#documents.get(uriString);

		if (documentData) {
			this._logDebug(`$acceptModelSaved: URI='${uriString}'`);

			const wasDirty = documentData.document.isDirty;

			// Saved implies not dirty
			documentData._acceptIsDirtyInternal(false);

			this.#onDidSaveDocumentEmitter.fire(documentData.document);

			// If the document's dirty state changed from true to false due to the save,

			// an onDidChangeTextDocument event should also be fired (with empty content changes).
			if (wasDirty) {
				this.#onDidChangeDocumentEmitter.fire(
					Object.freeze({
						document: documentData.document,

						contentChanges: Object.freeze(
							[],
						) as readonly VscodeTextDocumentContentChangeEvent[],

						reason: undefined,
					}),
				);
			}
		} else {
			this._logWarn(
				`$acceptModelSaved: Document with URI '${uriString}' not found in local cache.`,
			);
		}
	}

	/**
	 * (Custom method, not standard in VscodeExtHostDocumentsShape, but part of original Cocoon shim logic)
	 * Accepts a change in the dirty state of a model, typically pushed from MainThread if state
	 * changes for reasons other than direct save/edit (e.g., reverting a file).
	 * @param uriComponents The URI DTO of the document.
	 * @param isDirty The new dirty state.
	 */
	public $acceptDirtyStateChanged(
		uriComponents: VSCodeInternalUriComponents,

		isDirty: boolean,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptDirtyStateChanged: Failed to revive URI from DTO. Dirty state change cannot be processed.",

				"Received DTO:",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		const documentData = this.#documents.get(uriString);

		if (documentData) {
			this._logDebug(
				`$acceptDirtyStateChanged: URI='${uriString}' -> isDirty=${isDirty}`,
			);

			const dirtinessActuallyChanged =
				documentData._acceptIsDirtyInternal(isDirty);

			if (dirtinessActuallyChanged) {
				// VS Code typically fires onDidChangeTextDocument if dirtiness *actually* changes,

				// even without content changes, as it's a state change of the document.
				this.#onDidChangeDocumentEmitter.fire(
					Object.freeze({
						document: documentData.document,

						contentChanges: Object.freeze(
							[],
						) as readonly VscodeTextDocumentContentChangeEvent[],

						// No specific reason for just dirty state change from this RPC
						reason: undefined,
					}),
				);
			}
		} else {
			this._logWarn(
				`$acceptDirtyStateChanged: Document with URI '${uriString}' not found in local cache.`,
			);
		}
	}

	/** {@inheritDoc VscodeExtHostDocumentsShape.$acceptModelLanguageChanged} */
	public $acceptModelLanguageChanged(
		uriComponents: VSCodeInternalUriComponents,

		newLanguageId: string,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptModelLanguageChanged: Failed to revive URI from DTO. Language change cannot be processed.",

				"Received DTO:",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		const documentData = this.#documents.get(uriString);

		if (documentData) {
			this._logDebug(
				`$acceptModelLanguageChanged: URI='${uriString}' from Lang='${documentData.languageId}' to '${newLanguageId}'`,
			);

			const languageActuallyChanged =
				documentData._acceptLanguageIdInternal(newLanguageId);

			if (languageActuallyChanged) {
				// Firing onDidChangeTextDocument for language change is consistent with VS Code behavior,

				// as it's a significant metadata change affecting how the document is interpreted and displayed.
				this.#onDidChangeDocumentEmitter.fire(
					Object.freeze({
						document: documentData.document,

						contentChanges: Object.freeze(
							[],
						) as readonly VscodeTextDocumentContentChangeEvent[],

						// No specific reason for language change.
						reason: undefined,
					}),
				);
			}
		} else {
			this._logWarn(
				`$acceptModelLanguageChanged: Document with URI '${uriString}' not found in local cache.`,
			);
		}
	}

	/**
	 * (Custom method, not standard in VscodeExtHostDocumentsShape, but part of original Cocoon shim logic)
	 * Accepts a change in the encoding of a model. This is less common to be pushed via RPC
	 * as encoding is often detected or set during open/save.
	 * @param uriComponents The URI DTO of the document.
	 * @param newEncoding The new encoding string (e.g., "utf8", "utf16le").
	 */
	public $acceptEncodingChanged(
		uriComponents: VSCodeInternalUriComponents,

		newEncoding: string,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptEncodingChanged: Failed to revive URI from DTO. Encoding change cannot be processed.",

				"Received DTO:",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		const documentData = this.#documents.get(uriString);

		if (documentData) {
			this._logDebug(
				`$acceptEncodingChanged: URI='${uriString}' from Encoding='${documentData.encoding}' to '${newEncoding}'`,
			);

			const encodingActuallyChanged =
				documentData._acceptEncodingInternal(newEncoding);

			if (encodingActuallyChanged) {
				// There's no standard vscode.TextDocument event specifically for encoding change.
				// This update is primarily for internal state consistency if other parts of Cocoon
				// (or extensions that might somehow access this non-standard encoding property) need it.
				// If this should trigger a general document change event, it could be fired here.
				this._logInfo(
					`Document encoding changed for '${uriString}' to '${newEncoding}'. No standard public event fired for this change.`,
				);
			}
		} else {
			this._logWarn(
				`$acceptEncodingChanged: Document with URI '${uriString}' not found in local cache.`,
			);
		}
	}

	// --- URI Conversion Helpers (DTO <-> VscodeApiUri) ---
	/**
	 * Converts URI components (from RPC, typically `VSCodeInternalUriComponents`) to a `vscode.Uri` (API type).
	 * @param uriDto The URI components DTO.
	 * @returns A `vscode.Uri` instance or `undefined` on failure.
	 */
	private _reviveUriDtoToVscodeApiUri(
		uriDto: VSCodeInternalUriComponents | undefined,
	): VscodeApiUri | undefined {
		if (!uriDto) return undefined;

		try {
			// Revive to vs/base/common/uri.URI
			const internalUri = VSCodeInternalURI.revive(uriDto);

			// Convert to vscode.Uri (API type)
			return VscodeApiUri.from(internalUri);
		} catch (e: any) {
			this._logError(
				"Failed to revive URI DTO to VscodeApiUri:",

				"DTO:",

				uriDto,

				"Error:",

				e,
			);

			return undefined;
		}
	}

	/**
	 * Converts a `vscode.Uri` (API type) to URI components (DTO for RPC).
	 * This method uses `BaseCocoonShim._convertApiArgToInternal` which should handle the
	 * actual marshalling to a DTO compatible with `VSCodeInternalUriComponents` (often with a `$mid`).
	 * @param uri The `vscode.Uri` API object.
	 * @returns URI components suitable for RPC, or `undefined` on failure.
	 */
	private _vscodeApiUriToDto(
		uri: VscodeApiUri,
	): VSCodeInternalUriComponents | undefined {
		// Relies on BaseCocoonShim's marshaller
		const components = this._convertApiArgToInternal(uri);

		// Validate if the converted components look like a marshalled URI DTO
		if (
			components &&
			(components.$mid === MarshalledId.UriSimple ||
				components.$mid === MarshalledId.Uri ||
				(components.scheme && components.path !== undefined))
		) {
			return components as VSCodeInternalUriComponents;
		}

		this._logError(
			"Failed to convert VscodeApiUri to DTO for RPC using BaseCocoonShim._convertApiArgToInternal. " +
				"The marshaller did not produce an expected URI DTO structure.",

			"Input URI:",

			uri,

			"Marshalled Output:",

			components,
		);

		// Fallback to manual construction if base marshaller fails or isn't producing the right DTO.
		// This ensures robustness but might miss specific $mid markers if the receiver strictly needs them.
		try {
			// Convert API URI to internal VS Code URI
			const internalUri = VSCodeInternalURI.from(uri);

			return {
				// Construct the DTO manually
				// Prefer UriSimple for lighter payloads
				$mid: MarshalledId.UriSimple,

				scheme: internalUri.scheme,

				authority: internalUri.authority,

				path: internalUri.path,

				query: internalUri.query,

				fragment: internalUri.fragment,
			};
		} catch (e: any) {
			this._logError(
				"Fallback VscodeApiUri to DTO manual conversion also failed for URI:",

				"Input URI:",

				uri,

				"Error:",

				e,
			);

			return undefined;
		}
	}

	/** Disposes of resources held by this service, including event emitters and cached documents. */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables
		super.dispose();

		this.#onDidAddDocumentEmitter.dispose();

		this.#onDidRemoveDocumentEmitter.dispose();

		this.#onDidChangeDocumentEmitter.dispose();

		this.#onDidSaveDocumentEmitter.dispose();

		// Dispose all cached CocoonDocumentData instances
		dispose([...this.#documents.values()]);

		this.#documents.clear();

		this._logInfo(
			"Disposed and cleared all document data and event emitters.",
		);
	}
}

/**
 * `CocoonDocumentData` holds the state for a single text document and provides
 * the `vscode.TextDocument` API facade for it. This class is instantiated by
 * `CocoonDocumentService` for each document managed in the extension host.
 */
export class CocoonDocumentData implements IDisposable {
	// vscode.Uri (public API type) for this document.
	readonly #uriAdapter: VscodeApiUri;

	// Array of strings, each representing a line of the document.
	#linesInternal: string[];

	// End-of-line sequence (e.g., "\n" or "\r\n").
	#eolInternal: string;

	// Version number, incremented on change.
	#versionIdInternal: number;

	// Language identifier (e.g., "typescript", "markdown").
	#languageIdInternal: string;

	// True if the document has unsaved changes.
	#isDirtyInternal: boolean;

	// True if the document has been closed.
	#isClosedInternal = false;

	// Text encoding of the document (e.g., "utf8").
	#encodingInternal: string;

	// Logger instance.
	#logService?: ILogServiceForShim;

	// Reference to the parent document service.
	readonly #documentService: CocoonDocumentService;

	// Cache for character offsets of line starts, for performance.
	#lineStartsInternal: number[] | null = null;

	/** The public `vscode.TextDocument` API object for this document data. It's frozen to prevent modification. */
	public readonly document: VscodeTextDocument;

	constructor(
		// Parent service for operations like save
		documentService: CocoonDocumentService,

		uri: VscodeApiUri,

		lines: string[],

		eol: string,

		languageId: string,

		versionId: number,

		isDirty: boolean,

		// Document encoding
		encoding: string,

		logService?: ILogServiceForShim,
	) {
		this.#documentService = documentService;

		this.#uriAdapter = uri;

		this.#linesInternal = lines;

		this.#eolInternal = eol;

		this.#languageIdInternal = languageId;

		this.#versionIdInternal = versionId;

		this.#isDirtyInternal = isDirty;

		this.#encodingInternal = encoding;

		this.#logService = logService;

		// Create and freeze the public API facade
		this.document = this._createTextDocumentApiObject();

		this._logShimDebug(
			`Created document data: URI='${this.#uriAdapter.toString()}', Version=${this.#versionIdInternal}, Encoding='${this.#encodingInternal}'`,
		);
	}

	// --- Logging helpers specific to CocoonDocumentData instances ---
	private _logShimDebug(message: string, ...args: any[]): void {
		this.#logService?.debug(
			`[CocoonDocData][${this.#uriAdapter.fsPath || this.#uriAdapter.toString()}] ${message}`,

			...args,
		);
	}

	private _logShimError(message: string | Error, ...args: any[]): void {
		const prefix = `[CocoonDocData][${this.#uriAdapter.fsPath || this.#uriAdapter.toString()}]`;

		if (this.#logService) {
			this.#logService.error(
				message instanceof Error ? message : `${prefix} ${message}`,

				...args,
			);
		} else {
			// Fallback to console
			if (message instanceof Error)
				console.error(
					`${prefix} ${message.message}`,

					message.stack,

					...args,
				);
			else console.error(`${prefix} ${message}`, ...args);
		}
	}

	private _logShimWarn(message: string, ...args: any[]): void {
		this.#logService?.warn(
			`[CocoonDocData][${this.#uriAdapter.fsPath || this.#uriAdapter.toString()}] ${message}`,

			...args,
		);
	}

	// --- Internal state update methods called by CocoonDocumentService ---
	public _acceptLanguageIdInternal(newLanguageId: string): boolean {
		if (this.#languageIdInternal !== newLanguageId) {
			this.#languageIdInternal = newLanguageId;

			// Indicates a change occurred
			return true;
		}

		return false;
	}

	public _acceptIsDirtyInternal(newIsDirty: boolean): boolean {
		if (this.#isDirtyInternal !== newIsDirty) {
			this.#isDirtyInternal = newIsDirty;

			return true;
		}

		return false;
	}

	public _acceptEncodingInternal(newEncoding: string): boolean {
		if (this.#encodingInternal !== newEncoding) {
			this.#encodingInternal = newEncoding;

			return true;
		}

		return false;
	}

	public _markAsClosedInternal(): void {
		this.#isClosedInternal = true;
	}

	/**
	 * Applies content changes (edits) received from the MainThread to this document model.
	 * This method updates the internal line array, version, and EOL sequence.
	 * It assumes `changes` contains `RpcModelContentChange` items where `range` is a 0-based `IRange`.
	 * @param newVersionId The new version ID of the document after these changes.
	 * @param changes An array of `RpcModelContentChange` DTOs describing the edits.
	 * @param newEol The new end-of-line sequence for the document.
	 * @returns `true` if the document's content or EOL sequence actually changed, `false` otherwise.
	 */
	public _acceptContentChangesInternal(
		newVersionId: number,

		changes: RpcModelContentChange[],

		newEol: string,
	): boolean {
		let eolChanged = false;

		if (this.#eolInternal !== newEol) {
			this.#eolInternal = newEol;

			// EOL change invalidates line start offsets
			this.#lineStartsInternal = null;

			eolChanged = true;
		}

		// If version is stale for content, but EOL might have changed.
		if (
			this.#versionIdInternal >= newVersionId &&
			newVersionId !== -1 /* -1 can force override */
		) {
			this._logShimDebug(
				`Skipping content changes for V${newVersionId} (current V${this.#versionIdInternal}). EOL change alone: ${eolChanged}.`,
			);

			// Return true only if EOL changed, no content change applied
			return eolChanged;
		}

		// Invalidate offset cache due to content change
		this.#lineStartsInternal = null;

		// Work on a mutable copy
		let currentLinesSnapshot = [...this.#linesInternal];

		// RpcModelContentChange.range is an IRange {startLineNumber,startColumn,endLineNumber,endColumn} (0-based from protocol)
		// These changes are assumed to be ordered correctly by the main thread (non-overlapping or sequential).
		for (const change of changes) {
			// Convert 0-based protocol IRange DTO to 0-based API VscodeRange
			const vscodeRange = localTypeConverters.Range.toApiRange(
				change.range,
			);

			const textToInsert = change.text;

			currentLinesSnapshot = this._applyDeleteRangeApi(
				currentLinesSnapshot,

				vscodeRange,
			);

			currentLinesSnapshot = this._applyInsertTextApi(
				currentLinesSnapshot,

				vscodeRange.start,

				textToInsert,
			);
		}

		this.#linesInternal = currentLinesSnapshot;

		this.#versionIdInternal = newVersionId;

		// Content (and potentially EOL) changed
		return true;
	}

	// Helper methods for applying changes, operating on 0-based VscodeRange/VscodePosition
	private _applyDeleteRangeApi(
		lines: string[],

		range: VscodeRange,
	): string[] {
		if (range.isEmpty) return lines;

		// Operate on a copy
		const currentDocLines = [...lines];

		const { start, end } = range;

		if (start.line === end.line) {
			// Single-line deletion
			const lineText = currentDocLines[start.line];

			currentDocLines[start.line] =
				lineText.substring(0, start.character) +
				lineText.substring(end.character);
		} else {
			// Multi-line deletion
			const firstLineText = currentDocLines[start.line];

			const lastLineText = currentDocLines[end.line];

			// Content of start line up to deletion point, concatenated with content of end line after deletion point.
			currentDocLines[start.line] =
				firstLineText.substring(0, start.character) +
				lastLineText.substring(end.character);

			// Remove all intermediate lines and the original end line (now merged into start.line).
			currentDocLines.splice(start.line + 1, end.line - start.line);
		}

		return currentDocLines;
	}

	private _applyInsertTextApi(
		lines: string[],

		position: VscodePosition,

		text: string,
	): string[] {
		// No text to insert.
		if (!text) return lines;

		// Operate on a copy
		const currentDocLines = [...lines];

		const { line, character } = position;

		// Normalize newlines in the text to be inserted to match this document's EOL sequence.
		const normalizedTextToInsert = text.replace(
			/\r\n|\n|\r/g,

			this.#eolInternal,
		);

		// Use VS Code's utility for robust line splitting.
		const insertTextLines = splitLines(normalizedTextToInsert);

		if (insertTextLines.length === 1) {
			// Single-line insert (no newlines in `text`)
			const lineText = currentDocLines[line];

			currentDocLines[line] =
				lineText.substring(0, character) +
				insertTextLines[0] +
				lineText.substring(character);
		} else {
			// Multi-line insert
			const lineText = currentDocLines[line];

			const textAfterInsertPointOnOriginalLine =
				// Text on original line after insertion point.
				lineText.substring(character);

			// First line of insert replaces content from insertion point on the original line.
			currentDocLines[line] =
				lineText.substring(0, character) + insertTextLines[0];

			// Remaining lines to insert.
			const subsequentLinesToInsert = insertTextLines.slice(1);

			// The last line of the inserted text needs to be prepended to the `textAfterInsertPointOnOriginalLine`.
			subsequentLinesToInsert[subsequentLinesToInsert.length - 1] +=
				textAfterInsertPointOnOriginalLine;

			// Splice in the new lines after the current line.
			currentDocLines.splice(line + 1, 0, ...subsequentLinesToInsert);
		}

		return currentDocLines;
	}

	// --- Line Start Offset Cache for efficient offsetAt/positionAt ---
	#ensureLineStartsAvailable(): void {
		if (this.#lineStartsInternal === null) {
			const eolCharacterLength = this.#eolInternal.length;

			let currentOffset = 0;

			// Offset of the first line (index 0) is always 0.
			const r: number[] = [0];

			// Calculate offset for the start of each subsequent line.
			for (let i = 0; i < this.#linesInternal.length - 1; i++) {
				// Iterate up to the second-to-last line.
				currentOffset +=
					this.#linesInternal[i].length + eolCharacterLength;

				r.push(currentOffset);
			}

			this.#lineStartsInternal = r;
		}
	}

	// --- vscode.TextDocument API Implementation ---
	private _createTextDocumentApiObject(): VscodeTextDocument {
		// Capture `this` (CocoonDocumentData instance) for getters in the API object.
		const self = this;

		const textDoc: VscodeTextDocument = {
			get uri() {
				return self.#uriAdapter;
			},

			get fileName() {
				return self.#uriAdapter.fsPath;

				// fsPath is correct for 'file' URIs.
			},

			get isUntitled() {
				// Check against common schemes for untitled documents.
				return (
					self.#uriAdapter.scheme === Schemas.untitled ||
					self.#uriAdapter.scheme === Schemas.vscodeInteractiveInput
				);
			},

			get languageId() {
				return self.#languageIdInternal;
			},

			get version() {
				return self.#versionIdInternal;
			},

			get isClosed() {
				return self.#isClosedInternal;
			},

			get isDirty() {
				return self.#isDirtyInternal;
			},

			get eol() {
				// Convert internal EOL string to vscode.EndOfLine enum.
				return self.#eolInternal === "\n"
					? VscodeEndOfLine.LF
					: VscodeEndOfLine.CRLF;
			},

			get lineCount() {
				return self.#linesInternal.length;
			},

			save: async (): Promise<boolean> => {
				if (self.#isClosedInternal) {
					self._logShimError(
						"Document.save() called on a closed document. Operation aborted.",
					);

					// API usually returns boolean indicating success/failure.
					return false;
				}

				const proxy =
					self.#documentService.getMainThreadDocumentsProxy();

				if (!proxy) {
					self._logShimError(
						"Cannot save document: MainThreadDocuments RPC proxy is unavailable.",
					);

					return false;
				}

				try {
					// Convert vscode.Uri (API type) to DTO (VSCodeInternalUriComponents) for RPC.
					// This cast relies on CocoonDocumentService extending BaseCocoonShim or providing the method.
					const uriDto = (
						self.#documentService as any as BaseCocoonShim
					)._convertApiArgToInternal(self.#uriAdapter);

					if (!uriDto) {
						self._logShimError(
							"Failed to convert document URI to DTO for save operation. Cannot save.",
						);

						return false;
					}

					const success = await proxy.$trySaveDocument(uriDto);

					// MainThread will subsequently call $acceptModelSaved, which updates the dirty flag and fires an event.
					return success;
				} catch (e: any) {
					self._logShimError(
						"Error during document save RPC call to MainThreadDocuments:",

						refineErrorForShim(
							e,

							self.#logService,

							"document.save",
						),
					);

					// API usually returns boolean
					return false;
				}
			},

			lineAt: (
				lineOrPosition: number | VscodePosition,
			): VscodeTextLine => {
				const lineIndex =
					typeof lineOrPosition === "number"
						? lineOrPosition
						: lineOrPosition.line;

				if (lineIndex < 0 || lineIndex >= self.#linesInternal.length) {
					throw new RangeError(
						`Illegal value for line number: ${lineIndex}. Must be between 0 and ${self.#linesInternal.length - 1} (inclusive).`,
					);
				}

				const lineText = self.#linesInternal[lineIndex];

				const range = new VscodeRange(
					lineIndex,

					0,

					lineIndex,

					lineText.length,
				);

				// rangeIncludingLineBreak includes the EOL characters for all but the last line.
				const rangeIncludingLineBreak =
					lineIndex < self.#linesInternal.length - 1
						? // Ends at the start of the next line
							new VscodeRange(lineIndex, 0, lineIndex + 1, 0)
						: // For the last line, it's just the line's range.
							range;

				const firstNonWhitespaceCharacterIndex =
					lineText.match(/^\s*/)?.[0].length ?? 0;

				return Object.freeze({
					// Ensure the returned TextLine object is immutable.
					lineNumber: lineIndex,

					text: lineText,

					range,

					rangeIncludingLineBreak,

					firstNonWhitespaceCharacterIndex,

					isEmptyOrWhitespace:
						firstNonWhitespaceCharacterIndex === lineText.length,
				});
			},

			offsetAt: (position: VscodePosition): number => {
				// Ensure position is within document bounds.
				position = self._validatePositionApi(position);

				// Ensure #lineStartsInternal is populated.
				self.#ensureLineStartsAvailable();

				if (!self.#lineStartsInternal)
					throw new Error(
						"Internal error: Line starts cache unavailable for offsetAt.",
					);

				// If position.line is beyond the cached line starts (e.g., on the last line if cache only stores starts of lines *before* last),

				// or if document is empty/single line where cache might be just [0].
				if (position.line >= self.#lineStartsInternal.length) {
					// This typically means position.line is the index of the last line.
					// Start with the offset of the last cached line start.
					let calculatedOffset =
						self.#lineStartsInternal[
							self.#lineStartsInternal.length - 1
						];

					// Add lengths of lines from the last cached start up to the target line.
					for (
						let i = self.#lineStartsInternal.length - 1;
						i < position.line;
						i++
					) {
						calculatedOffset +=
							self.#linesInternal[i].length +
							self.#eolInternal.length;
					}

					// Add character offset on the target line.
					calculatedOffset += position.character;

					// Ensure offset does not exceed total document length (important for positions at very end).
					const totalDocumentLength = self.#linesInternal.reduce(
						(sum, line, idx) =>
							sum +
							line.length +
							(idx < self.#linesInternal.length - 1
								? self.#eolInternal.length
								: 0),

						0,
					);

					return Math.min(calculatedOffset, totalDocumentLength);
				}

				return (
					self.#lineStartsInternal[position.line] + position.character
				);
			},

			positionAt: (offset: number): VscodePosition => {
				// Ensure offset is a non-negative integer.
				offset = Math.max(0, Math.floor(offset));

				self.#ensureLineStartsAvailable();

				if (!self.#lineStartsInternal)
					throw new Error(
						"Internal error: Line starts cache unavailable for positionAt.",
					);

				let low = 0,
					high = self.#lineStartsInternal.length,
					mid = 0,
					lineStartOffset = 0;

				// Binary search to find the line index that contains the offset.
				while (low < high) {
					mid = low + Math.floor((high - low) / 2);

					lineStartOffset = self.#lineStartsInternal[mid];

					if (offset >= lineStartOffset) {
						// Offset is in this line or a later one.
						low = mid + 1;
					} else {
						// Offset is in an earlier line.
						high = mid;
					}
				}

				// After loop, `low - 1` is the index of the line containing the offset.
				const lineIndex = Math.max(0, low - 1);

				if (lineIndex >= self.#linesInternal.length) {
					// Offset is beyond the document content. Return position at the very end of the document.
					const lastLineIndex = Math.max(
						0,

						self.#linesInternal.length - 1,
					);

					return new VscodePosition(
						lastLineIndex,

						self.#linesInternal[lastLineIndex]?.length ?? 0,
					);
				}

				// Start offset of the identified line.
				lineStartOffset = self.#lineStartsInternal[lineIndex];

				const character = Math.min(
					// Character on the line.
					offset - lineStartOffset,

					// Cap character at the actual line length.
					self.#linesInternal[lineIndex]?.length ?? 0,
				);

				return new VscodePosition(lineIndex, character);
			},

			getText: (range?: VscodeRange): string => {
				// No range means full document text.
				if (!range) return self.#linesInternal.join(self.#eolInternal);

				// Ensure range is within document bounds.
				range = self._validateRangeApi(range);

				// Empty range means empty string.
				if (range.isEmpty) return "";

				const { start, end } = range;

				if (start.line === end.line) {
					// Range is within a single line.
					return self.#linesInternal[start.line].substring(
						start.character,

						end.character,
					);
				}

				// Multi-line range.
				const resultLines: string[] = [
					self.#linesInternal[start.line].substring(start.character),

					// Text from start line.
				];

				for (let i = start.line + 1; i < end.line; i++) {
					// Full intermediate lines.
					resultLines.push(self.#linesInternal[i]);
				}

				resultLines.push(
					self.#linesInternal[end.line].substring(0, end.character),

					// Text from end line.
				);

				return resultLines.join(self.#eolInternal);
			},

			getWordRangeAtPosition: (
				position: VscodePosition,

				regex?: RegExp,
			): VscodeRange | undefined => {
				position = self._validatePositionApi(position);

				const lineText = self.#linesInternal[position.line];

				// Should not happen if position is validated.
				if (lineText === undefined) return undefined;

				const wordDefinition = ensureValidWordDefinition(
					regex || DEFAULT_WORD_REGEXP_IMPORTED,

					// Use ensured helper.
				);

				if (getWordAtTextInternal) {
					// Prefer VS Code's internal helper if available.
					try {
						// VS Code's getWordAtText expects 1-based column, and returns 1-based columns.
						const wordAt = getWordAtTextInternal(
							position.character + 1,

							wordDefinition,

							lineText,

							0,
						);

						if (wordAt) {
							// Convert 1-based columns from wordAt back to 0-based for VscodeRange.
							return new VscodeRange(
								position.line,

								wordAt.startColumn - 1,

								position.line,

								wordAt.endColumn - 1,
							);
						}
					} catch (e: any) {
						self._logShimError(
							"Error using internal getWordAtText for getWordRangeAtPosition. Falling back to simpler regex match.",

							e,
						);

						// Fallback to simpler regex match if internal helper fails or is unavailable.
					}
				}

				// Fallback regex logic (if getWordAtTextInternal is not available or failed).
				// Reset regex state for fresh execution.
				wordDefinition.lastIndex = 0;

				let match: RegExpExecArray | null;

				while ((match = wordDefinition.exec(lineText))) {
					const startIndex = match.index;

					const endIndex = startIndex + match[0].length;

					if (
						startIndex <= position.character &&
						endIndex >= position.character
					) {
						// Found a word spanning the given character position.
						return new VscodeRange(
							position.line,

							startIndex,

							position.line,

							endIndex,
						);
					}

					// Guard against infinite loops with zero-length matches if regex is not well-behaved.
					if (
						wordDefinition.lastIndex === startIndex &&
						match[0].length === 0
					)
						break;
				}

				// No word found at the position with the given regex.
				return undefined;
			},

			validateRange: (range: VscodeRange): VscodeRange =>
				self._validateRangeApi(range),

			validatePosition: (position: VscodePosition): VscodePosition =>
				self._validatePositionApi(position),
		};

		// Ensure the returned API object is immutable by extensions.
		return Object.freeze(textDoc);
	}

	// --- Validation helpers using VscodePosition/VscodeRange (0-based) ---
	private _validatePositionApi(position: VscodePosition): VscodePosition {
		if (!(position instanceof VscodePosition))
			throw new TypeError(
				"Invalid argument: Not a vscode.Position instance.",
			);

		let { line, character } = position;

		let changed = false;

		if (line < 0) {
			line = 0;

			character = 0;

			changed = true;

			// Line cannot be negative.
		}

		const lineCount = this.#linesInternal.length;

		if (line >= lineCount) {
			// Line is beyond the last line.
			// Clamp to last valid line index (or 0 if document is empty).
			line = Math.max(0, lineCount - 1);

			// Position at the end of that line.
			character = this.#linesInternal[line]?.length ?? 0;

			changed = true;
		} else {
			// Line is within document bounds.
			// Max character offset for this line.
			const maxCharacter = this.#linesInternal[line].length;

			if (character < 0) {
				character = 0;

				changed = true;

				// Character cannot be negative.
			}

			if (character > maxCharacter) {
				character = maxCharacter;

				changed = true;

				// Character cannot exceed line length.
			}
		}

		// Return new instance only if changed.
		return changed ? new VscodePosition(line, character) : position;
	}

	private _validateRangeApi(range: VscodeRange): VscodeRange {
		if (!(range instanceof VscodeRange))
			throw new TypeError(
				"Invalid argument: Not a vscode.Range instance.",
			);

		const start = this._validatePositionApi(range.start);

		const end = this._validatePositionApi(range.end);

		// No change needed.
		if (start === range.start && end === range.end) return range;

		// Return new instance with validated positions.
		return new VscodeRange(start, end);
	}

	// --- Public getters for CocoonDocumentService (used by constructor, and potentially by other shims needing internal state) ---
	get uri(): VscodeApiUri {
		return this.#uriAdapter;
	}

	get version(): number {
		return this.#versionIdInternal;
	}

	get languageId(): string {
		return this.#languageIdInternal;
	}

	get encoding(): string {
		return this.#encodingInternal;

		// Expose encoding if needed by other parts
	}

	/** Disposes of resources held by this document data instance. (Currently a NOP as it holds no complex event emitters etc.) */
	public dispose(): void {
		this._logShimDebug(
			`Disposing document data for URI='${this.#uriAdapter.toString()}'`,
		);

		// No specific resources (like event listeners on this instance) are held directly by CocoonDocumentData
		// that require explicit disposal beyond what garbage collection handles once it's removed from the cache.
		// If this class were to manage its own event emitters or other IDisposable resources, they would be disposed here.
	}
}
