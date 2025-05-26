/*---------------------------------------------------------------------------------------------
 * Copyright (c) Cocoon Project Contributors. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------
 * Cocoon Document Shim Service (document-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtHostDocumentsAndEditors` service interface, primarily focusing on
 * the `IExtHostDocuments` aspects for Cocoon's scope. It is responsible for managing
 * `TextDocument` data instances, representing open text documents within the
 * Cocoon environment (extension host), and synchronizing their state with the
 * host process (Mountain).
 *
 * - `CocoonDocumentService`:
 *   - Manages a collection of `CocoonDocumentData` instances, keyed by document URI.
 *   - Provides API methods like `getDocumentData()` (internal shim use) and `getTextDocuments()`
 *     (for `vscode.workspace.textDocuments`).
 *   - Exposes `vscode.workspace` document lifecycle events (`onDidOpenTextDocument`, etc.)
 *     by firing its internal `VscodeEmitter` instances.
 *   - Implements RPC methods (as part of `ExtHostDocumentsShape` from `extHost.protocol.ts`)
 *     that are called by the main thread (e.g., `$acceptModelAdded`, `$acceptModelRemoved`,
 *
 *
 *
 *     `$acceptModelChanged`) to update document states in the extension host.
 *
 * - `CocoonDocumentData`:
 *   - Represents the state of a single text document (URI, lines, version, language ID,
 *
 *
 *
 *     dirty status, EOL, encoding).
 *   - Provides the actual `vscode.TextDocument` API facade that extensions interact with.
 *   - Handles the application of content changes received from the main thread via its
 *     `_acceptContentChangesInternal` method.
 *   - Its `save()` method proxies the save operation to the main thread via an RPC call
 *     (`$trySaveDocument`) on `MainThreadDocumentsShape`.
 *
 * Key Interactions:
 * - `CocoonDocumentService` is registered with Dependency Injection (DI) in the Cocoon
 *   environment (e.g., `Cocoon/index.ts`) as `IExtHostDocuments` (and potentially
 *   `IExtHostDocumentsAndEditors`).
 * - Its `getTextDocuments()` and document lifecycle events are exposed via `vscode.workspace`
 *   (likely through an intermediary `ShimExtHostWorkspace` service).
 * - Receives document state updates from the main thread's `MainThreadDocuments` service.
 * - Makes RPC calls to the main thread's `MainThreadDocuments` service for operations like saving.
 *
 * Relies on VS Code internal types and utility functions where appropriate, adapting them
 * for the Cocoon shim environment.
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable, dispose, IDisposable } from "vs/base/common/lifecycle";
import { MarshalledId } from "vs/base/common/marshalling";
import { Schemas } from "vs/base/common/network";
// For consistent line splitting
import { splitLines } from "vs/base/common/strings";
import {
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
// Used for DTOs, 0-based in extHost protocol
import type { IRange as VSCodeInternalIRange } from "vs/editor/common/core/range";
import {
	DEFAULT_WORD_REGEXP as DEFAULT_WORD_REGEXP_FALLBACK,
	ensureValidWordDefinition as ensureValidWordDefinitionInternal,
	getWordAtText as getWordAtTextInternal,
} from "vs/editor/common/core/wordHelper";
import {
	ExtHostContext,
	MainContext,
	type IModelChangedEventData as RpcModelChangedEvent,
	type IModelContentChange as RpcModelContentChange,
	type ExtHostDocumentsShape as VscodeExtHostDocumentsShape,
	type MainThreadDocumentsShape as VscodeMainThreadDocumentsShape,
} from "vs/workbench/api/common/extHost.protocol";
// vscode API types
import {
	TextDocumentChangeReason,
	// vscode.Uri
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

// Ensure `ensureValidWordDefinitionInternal` has its global flag logic if not already standard.
// VS Code's `ensureValidWordDefinition` already handles this.
// This block is kept for compatibility if the imported version behaves differently or needs a fallback.
// const _DEFAULT_WORD_REGEXP_FALLBACK = /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;

// let _ensureValidWordDefinition: (wordDefinition?: RegExp) => RegExp = ensureValidWordDefinitionInternal ||
//     ((wordDefinition?: RegExp): RegExp => {

// Default to fallback
// 		let result: RegExp = _DEFAULT_WORD_REGEXP_FALLBACK;

// 		if (wordDefinition instanceof RegExp) {

// 			if (!wordDefinition.global) {

// Ensure global flag for iterative matching
// 				let flags = "g";

// 				if (wordDefinition.ignoreCase) flags += "i";

// 				if (wordDefinition.multiline) flags += "m";

// 				if (wordDefinition.unicode) flags += "u";

// 				result = new RegExp(wordDefinition.source, flags);

// 			} else {

// 				result = wordDefinition;

// 			}

// 		}

// Reset lastIndex before use
// 		result.lastIndex = 0;

// 		return result;

// 	});

/**
 * Local type converters, primarily for Ranges.
 * In a full VS Code `extHost`, these are more comprehensive.
 * This simplified version focuses on `IRange` DTO to `vscode.Range`.
 */
const localTypeConverters = {
	Range: {
		/**
		 * Converts an `IRange` DTO (0-based line and column numbers, as typically
		 * received over RPC for model changes) to a `vscode.Range` object.
		 * @param rangeDto The IRange DTO.
		 * @returns A `vscode.Range` object.
		 */
		to: (rangeDto: VSCodeInternalIRange | undefined): VscodeRange => {
			if (!rangeDto) {
				// Default to an empty range at (0,0) for safety if DTO is undefined.
				return new VscodeRange(0, 0, 0, 0);
			}

			// Assuming rangeDto is { startLineNumber, startColumn, endLineNumber, endColumn }

			// and these are 0-based, matching vscode.Range constructor.
			if (
				"startLineNumber" in rangeDto &&
				"startColumn" in rangeDto &&
				"endLineNumber" in rangeDto &&
				"endColumn" in rangeDto
			) {
				return new VscodeRange(
					rangeDto.startLineNumber,

					rangeDto.startColumn,

					rangeDto.endLineNumber,

					rangeDto.endColumn,
				);
			}

			// Fallback for unexpected DTO structures - this is risky and indicates a mismatch.
			console.warn(
				"[DocumentShim TypeConverter] Unknown range DTO structure, attempting generic conversion. This may lead to errors.",

				rangeDto,
			);

			return new VscodeRange(
				(rangeDto as any).startLineNumber ?? (rangeDto as any).e ?? 0,

				(rangeDto as any).startColumn ?? (rangeDto as any).f ?? 0,

				(rangeDto as any).endLineNumber ?? (rangeDto as any).g ?? 0,

				(rangeDto as any).endColumn ?? (rangeDto as any).h ?? 0,
			);
		},
	},
};

// --- Type Definitions ---

/**
 * Defines the RPC interface for the `MainThreadDocuments` service expected on the main thread.
 * This subset includes methods relevant to this document shim.
 */
type MainThreadDocumentsProxyService = Pick<
	VscodeMainThreadDocumentsShape,
	"$tryCreateDocument" | "$tryOpenDocument" | "$trySaveDocument"
>;

/**
 * `CocoonDocumentService` manages text document data and provides document-related APIs and events.
 * It implements `VscodeExtHostDocumentsShape` to receive updates from the MainThread.
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
	 * @param rpcService The RPC service adapter.
	 * @param logService The logging service.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		// Service identifier for logging
		super("ExtHostDocuments", rpcService, logService);

		this._log("Initializing...");

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

				this._log(
					"Registered self for incoming RPC calls (ExtHostDocuments).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to set self for RPC (ExtHostDocuments):",

					e,
				);
			}
		}

		if (!this.#mainThreadDocumentsProxy) {
			this._logError(
				"MainThreadDocuments RPC proxy NOT obtained. Document operations (save, create, open) will fail.",
			);
		}
	}

	/** Provides access to the MainThreadDocuments RPC proxy, primarily for `CocoonDocumentData`. */
	public getMainThreadDocumentsProxy(): MainThreadDocumentsProxyService | null {
		return this.#mainThreadDocumentsProxy;
	}

	// --- Internal API for other ExtHost services ---
	/**
	 * Retrieves the `CocoonDocumentData` for a given URI.
	 * @param uri The `vscode.Uri` of the document.
	 * @returns The `CocoonDocumentData` instance, or `undefined` if not found.
	 */
	public getDocumentData(uri: VscodeApiUri): CocoonDocumentData | undefined {
		if (!(uri instanceof VscodeApiUri)) {
			this._logWarn(
				"getDocumentData called with non-VscodeApiUri instance:",

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
	 * Gets all currently known text documents.
	 * @returns A readonly array of `vscode.TextDocument` objects.
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

		// `RpcModelAddedData` (standard in extHost.protocol.ts) does not include encoding.
		// This parameter is kept for potential custom protocol needs but marked as unused.
		_encoding_unused?: string,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptModelAdded: Failed to revive URI from DTO.",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		if (this.#documents.has(uriString)) {
			this._logWarn(
				`$acceptModelAdded: Document with URI '${uriString}' already exists. Ignoring add notification.`,
			);

			return;
		}

		// this._log(`$acceptModelAdded: URI='${uriString}', Version=${versionId}, Lang='${languageId}', Dirty=${isDirty}, Lines=${lines.length}`);

		const documentData = new CocoonDocumentData(
			// Pass service instance
			this,

			revivedVscodeApiUri,

			lines,

			eol,

			languageId,

			versionId,

			isDirty,

			// Default encoding, as standard protocol doesn't provide it here.
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
				"$acceptModelRemoved: Failed to revive URI from DTO.",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		const documentData = this.#documents.get(uriString);

		if (documentData) {
			// this._log(`$acceptModelRemoved: URI='${uriString}'`);

			// Mark internal state as closed
			documentData._markAsClosedInternal();

			this.#documents.delete(uriString);

			this.#onDidRemoveDocumentEmitter.fire(documentData.document);

			// Dispose the CocoonDocumentData instance itself
			dispose(documentData);
		} else {
			this._logWarn(
				`$acceptModelRemoved: Document with URI '${uriString}' not found in local cache.`,
			);
		}
	}

	/** {@inheritDoc VscodeExtHostDocumentsShape.$acceptModelChanged} */
	public $acceptModelChanged(
		uriComponents: VSCodeInternalUriComponents,

		// Contains changes, new versionId, EOL, isUndoing, isRedoing
		eventData: RpcModelChangedEvent,

		isDirty: boolean,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptModelChanged: Failed to revive URI from DTO.",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		const documentData = this.#documents.get(uriString);

		if (documentData) {
			// Version check: Apply changes only if the event's version ID is newer.
			// (VS Code allows versionId -1 to force override, not explicitly handled here but newVersionId comparison works).
			if (documentData.version >= eventData.versionId) {
				this._logWarn(
					`$acceptModelChanged: Stale event (V${eventData.versionId}) for URI '${uriString}' (current V${documentData.version}). Updating dirty state only.`,
				);

				// Still update dirty flag as per VS Code logic
				documentData._acceptIsDirtyInternal(isDirty);

				return;
			}

			// this._log(`$acceptModelChanged: URI='${uriString}', NewVersion=${eventData.versionId}, Changes=${eventData.changes.length}, NewEOL='${eventData.eol}', IsDirty=${isDirty}`);

			const contentChanged = documentData._acceptContentChangesInternal(
				eventData.versionId,

				eventData.changes,

				eventData.eol,
			);

			const dirtinessChanged =
				documentData._acceptIsDirtyInternal(isDirty);

			if (!contentChanged && !dirtinessChanged) {
				// this._log(`$acceptModelChanged: No effective change applied for URI '${uriString}', V${eventData.versionId}.`);

				// No actual change to content or dirty state that needs an event.
				return;
			}

			// If content changed, fire the onDidChangeTextDocument event.
			if (contentChanged) {
				const vscodeContentChanges: VscodeTextDocumentContentChangeEvent[] =
					eventData.changes.map((change) => ({
						// RpcModelContentChange.range is typically a 0-based IRange DTO on extHost side.
						range: localTypeConverters.Range.to(change.range),

						rangeOffset: change.rangeOffset,

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
			}
		} else {
			this._logWarn(
				`$acceptModelChanged: Document with URI '${uriString}' not found for update.`,
			);
		}
	}

	/** {@inheritDoc VscodeExtHostDocumentsShape.$acceptModelSaved} */
	public $acceptModelSaved(uriComponents: VSCodeInternalUriComponents): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptModelSaved: Failed to revive URI from DTO.",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		const documentData = this.#documents.get(uriString);

		if (documentData) {
			// this._log(`$acceptModelSaved: URI='${uriString}'`);

			const previousIsDirty = documentData.document.isDirty;

			// Saved implies not dirty
			documentData._acceptIsDirtyInternal(false);

			this.#onDidSaveDocumentEmitter.fire(documentData.document);

			// If only the dirty state changed (e.g., from true to false after save),

			// VS Code sometimes fires onDidChangeTextDocument.
			// This behavior is implicitly handled if `$acceptDirtyStateChanged` is part of the flow
			// or if `_acceptIsDirtyInternal` also triggers such logic when appropriate.
			// For now, explicit firing is isolated to `$acceptDirtyStateChanged`.
			if (
				previousIsDirty === true &&
				documentData.document.isDirty === false
			) {
				// Optionally, fire onDidChangeTextDocument if dirty state change alone warrants it.
				// See $acceptDirtyStateChanged for an example.
			}
		} else {
			this._logWarn(
				`$acceptModelSaved: Document with URI '${uriString}' not found.`,
			);
		}
	}

	/**
	 * (Custom method, not standard in VscodeExtHostDocumentsShape, but potentially useful for Cocoon)
	 * Accepts a change in the dirty state of a model.
	 * @param uriComponents The URI of the document.
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
				"$acceptDirtyStateChanged: Failed to revive URI from DTO.",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		const documentData = this.#documents.get(uriString);

		if (documentData) {
			// this._log(`$acceptDirtyStateChanged: URI='${uriString}' -> isDirty=${isDirty}`);

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
				`$acceptDirtyStateChanged: Document with URI '${uriString}' not found.`,
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
				"$acceptModelLanguageChanged: Failed to revive URI from DTO.",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		const documentData = this.#documents.get(uriString);

		if (documentData) {
			// this._log(`$acceptModelLanguageChanged: URI='${uriString}' from Lang='${documentData.languageId}' to '${newLanguageId}'`);

			const languageActuallyChanged =
				documentData._acceptLanguageIdInternal(newLanguageId);

			if (languageActuallyChanged) {
				// Firing onDidChangeTextDocument for language change is consistent with VS Code behavior,

				// as it's a significant metadata change of the document.
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
				`$acceptModelLanguageChanged: Document with URI '${uriString}' not found.`,
			);
		}
	}

	/**
	 * (Custom method, not standard in VscodeExtHostDocumentsShape, but potentially useful for Cocoon)
	 * Accepts a change in the encoding of a model.
	 * @param uriComponents The URI of the document.
	 * @param newEncoding The new encoding.
	 */
	public $acceptEncodingChanged(
		uriComponents: VSCodeInternalUriComponents,

		newEncoding: string,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptEncodingChanged: Failed to revive URI from DTO.",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		const documentData = this.#documents.get(uriString);

		if (documentData) {
			this._log(
				`$acceptEncodingChanged: URI='${uriString}' from Encoding='${documentData.encoding}' to '${newEncoding}'`,
			);

			const encodingActuallyChanged =
				documentData._acceptEncodingInternal(newEncoding);

			if (encodingActuallyChanged) {
				// There's no standard vscode.TextDocument event specifically for encoding change.
				// This update is primarily for internal state consistency if other parts of Cocoon need it.
				// If this should trigger a general document change event, it could be fired here (e.g. onDidChangeTextDocument with empty changes).
			}
		} else {
			this._logWarn(
				`$acceptEncodingChanged: Document with URI '${uriString}' not found.`,
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

				uriDto,

				e,
			);

			return undefined;
		}
	}

	/**
	 * Converts a `vscode.Uri` (API type) to URI components (DTO for RPC).
	 * This method prefers using the base shim's conversion utility if available and reliable,
	 *
	 *
	 *
	 * otherwise falls back to manual construction.
	 * @param uri The `vscode.Uri` API object.
	 * @returns URI components suitable for RPC or `undefined` on failure.
	 */
	private _vscodeApiUriToDto(
		uri: VscodeApiUri,
	): VSCodeInternalUriComponents | undefined {
		try {
			// Attempt conversion using the BaseCocoonShim's utility, which should handle marshalling.
			const components = this._convertApiArgToInternal(uri);

			if (
				components &&
				(components.$mid === MarshalledId.UriSimple ||
					components.$mid === MarshalledId.Uri ||
					(components.scheme && components.path !== undefined))
			) {
				return components as VSCodeInternalUriComponents;
			}

			this._logWarn(
				"Base marshaller did not produce expected URI DTO, falling back to manual conversion for URI:",

				uri,

				"Result:",

				components,
			);
		} catch (e: any) {
			this._logWarn(
				"Error using base marshaller for URI to DTO, falling back to manual conversion for URI:",

				uri,

				e,
			);
		}

		// Fallback: Manually construct the DTO
		try {
			// Convert API URI to internal VS Code URI
			const internalUri = VSCodeInternalURI.from(uri);

			return {
				// Use UriSimple for lighter payload
				$mid: MarshalledId.UriSimple,

				scheme: internalUri.scheme,

				authority: internalUri.authority,

				path: internalUri.path,

				query: internalUri.query,

				fragment: internalUri.fragment,
			};
		} catch (e: any) {
			this._logError(
				"Manual VscodeApiUri to DTO conversion also failed for URI:",

				uri,

				e,
			);

			return undefined;
		}
	}

	/** Disposes of resources held by this service. */
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

		this._log("Disposed.");
	}
}

/**
 * `CocoonDocumentData` holds the state for a single text document and provides
 * the `vscode.TextDocument` API facade for it.
 */
export class CocoonDocumentData implements IDisposable {
	// vscode.Uri for the public API
	readonly #uriAdapter: VscodeApiUri;

	#linesInternal: string[];

	#eolInternal: string;

	#versionIdInternal: number;

	#languageIdInternal: string;

	#isDirtyInternal: boolean;

	#isClosedInternal = false;

	#encodingInternal: string;

	#logService?: ILogServiceForShim;

	readonly #documentService: CocoonDocumentService;

	// Cache for line start offsets (character count)
	#lineStartsInternal: number[] | null = null;

	/** The public `vscode.TextDocument` API object for this document data. */
	public readonly document: VscodeTextDocument;

	constructor(
		documentService: CocoonDocumentService,

		uri: VscodeApiUri,

		lines: string[],

		eol: string,

		languageId: string,

		versionId: number,

		isDirty: boolean,

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

		// Create and freeze the API facade
		this.document = this._createTextDocumentApiObject();

		// this._logShimMessage(`Created document data: URI='${this.#uriAdapter.toString()}', Version=${this.#versionIdInternal}`);
	}

	private _logShimMessage(message: string, ...args: any[]): void {
		this.#logService?.trace(
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
	 * Applies content changes received from the MainThread.
	 * Assumes `changes` contains `RpcModelContentChange` items where `range` is a 0-based `IRange`.
	 * @returns `true` if content or EOL actually changed, `false` otherwise.
	 */
	public _acceptContentChangesInternal(
		newVersionId: number,

		changes: RpcModelContentChange[],

		newEol: string,
	): boolean {
		if (
			this.#versionIdInternal >= newVersionId &&
			newVersionId !==
				-1 /* -1 can force override in some VS Code contexts */
		) {
			// this._logShimMessage(`Skipping content changes for V${newVersionId} (current V${this.#versionIdInternal}). EOL change still possible.`);

			if (this.#eolInternal !== newEol) {
				this.#eolInternal = newEol;

				// EOL change invalidates offsets
				this.#lineStartsInternal = null;

				// EOL changed
				return true;
			}

			// No content change applied
			return false;
		}

		// Invalidate offset cache due to content change
		this.#lineStartsInternal = null;

		// Update EOL first, as it affects line splitting for inserts
		this.#eolInternal = newEol;

		// Work on a mutable copy
		let currentLinesSnapshot = [...this.#linesInternal];

		// RpcModelContentChange.range is assumed to be a 0-based IRange DTO.
		// Changes are assumed to be ordered correctly by the main thread (non-overlapping or sequential).
		for (const change of changes) {
			// Convert 0-based protocol range to 0-based API VscodeRange
			const vscodeRange = new VscodeRange(
				change.range.startLineNumber,

				change.range.startColumn,

				change.range.endLineNumber,

				change.range.endColumn,
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

		// Content changed
		return true;
	}

	// Helper methods for applying changes, operating on 0-based VscodeRange/VscodePosition
	private _applyDeleteRangeApi(
		lines: string[],

		range: VscodeRange,
	): string[] {
		if (range.isEmpty) return lines;

		const currentDocLines = [...lines];

		const { start, end } = range;

		if (start.line === end.line) {
			const lineText = currentDocLines[start.line];

			currentDocLines[start.line] =
				lineText.substring(0, start.character) +
				lineText.substring(end.character);
		} else {
			const firstLineText = currentDocLines[start.line];

			const lastLineText = currentDocLines[end.line];

			currentDocLines[start.line] =
				firstLineText.substring(0, start.character) +
				lastLineText.substring(end.character);

			currentDocLines.splice(start.line + 1, end.line - start.line);
		}

		return currentDocLines;
	}

	private _applyInsertTextApi(
		lines: string[],

		position: VscodePosition,

		text: string,
	): string[] {
		if (!text) return lines;

		const currentDocLines = [...lines];

		const { line, character } = position;

		const normalizedTextToInsert = text.replace(
			/\r\n|\n|\r/g,

			this.#eolInternal,
		);

		// Uses vs/base/common/strings utility
		const insertTextLines = splitLines(normalizedTextToInsert);

		if (insertTextLines.length === 1) {
			const lineText = currentDocLines[line];

			currentDocLines[line] =
				lineText.substring(0, character) +
				insertTextLines[0] +
				lineText.substring(character);
		} else {
			const lineText = currentDocLines[line];

			const textAfterInsertPointOnOriginalLine =
				lineText.substring(character);

			currentDocLines[line] =
				lineText.substring(0, character) + insertTextLines[0];

			const subsequentLinesToInsert = insertTextLines.slice(1);

			subsequentLinesToInsert[subsequentLinesToInsert.length - 1] +=
				textAfterInsertPointOnOriginalLine;

			currentDocLines.splice(line + 1, 0, ...subsequentLinesToInsert);
		}

		return currentDocLines;
	}

	// --- Line Start Offset Cache ---
	#ensureLineStartsAvailable(): void {
		if (this.#lineStartsInternal === null) {
			const eolCharacterLength = this.#eolInternal.length;

			let currentOffset = 0;

			// Offset of the first line is always 0
			const r: number[] = [0];

			for (let i = 0; i < this.#linesInternal.length - 1; i++) {
				// Iterate up to second to last line for EOL
				currentOffset +=
					this.#linesInternal[i].length + eolCharacterLength;

				r.push(currentOffset);
			}

			this.#lineStartsInternal = r;
		}
	}

	// --- vscode.TextDocument API Implementation ---
	private _createTextDocumentApiObject(): VscodeTextDocument {
		// Capture 'this' (CocoonDocumentData instance) for getters
		const self = this;

		const textDoc: VscodeTextDocument = {
			get uri() {
				return self.#uriAdapter;
			},

			get fileName() {
				return self.#uriAdapter.fsPath;
			},

			get isUntitled() {
				return (
					self.#uriAdapter.scheme === Schemas.untitled ||
					self.#uriAdapter.scheme === Schemas.vscodeInteractiveInput
					// VS Code uses this for debug console input
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
						"Document.save() called on a closed document.",
					);

					return false;
				}

				const proxy =
					self.#documentService.getMainThreadDocumentsProxy();

				if (!proxy) {
					self._logShimError(
						"Cannot save document: MainThreadDocuments RPC proxy unavailable.",
					);

					return false;
				}

				try {
					// CocoonDocumentService extends BaseCocoonShim, which has _convertApiArgToInternal (or _vscodeApiUriToDto can be used)
					const uriDto = (
						self.#documentService as any
					)._vscodeApiUriToDto(self.#uriAdapter);

					if (!uriDto) {
						self._logShimError(
							"Failed to convert document URI to DTO for save operation.",
						);

						return false;
					}

					const success = await proxy.$trySaveDocument(uriDto);

					// MainThread will subsequently call $acceptModelSaved which updates dirty flag and fires event.
					return success;
				} catch (e: any) {
					self._logShimError(
						"Error during document save proxy call:",

						refineErrorForShim(e, self.#logService),
					);

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
						`Illegal value for line number: ${lineIndex}. Must be between 0 and ${self.#linesInternal.length - 1}.`,
					);
				}

				const lineText = self.#linesInternal[lineIndex];

				const range = new VscodeRange(
					lineIndex,

					0,

					lineIndex,

					lineText.length,
				);

				const rangeIncludingLineBreak =
					lineIndex < self.#linesInternal.length - 1
						? new VscodeRange(lineIndex, 0, lineIndex + 1, 0)
						: // Last line has no line break in its rangeIncludingLineBreak end
							range;

				const firstNonWhitespaceCharacterIndex =
					lineText.match(/^\s*/)?.[0].length ?? 0;

				return Object.freeze({
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
				position = self._validatePositionApi(position);

				self.#ensureLineStartsAvailable();

				if (!self.#lineStartsInternal)
					throw new Error(
						"Internal error: Line starts cache not available.",
					);

				if (position.line >= self.#lineStartsInternal.length) {
					// Position is on or beyond the last line for which an explicit start is cached.
					// Calculate offset based on the last cached line start and subsequent lines.
					let totalOffset =
						self.#lineStartsInternal[
							self.#lineStartsInternal.length - 1
						] ?? 0;

					for (
						let i = self.#lineStartsInternal.length - 1;
						i < position.line;
						i++
					) {
						totalOffset +=
							self.#linesInternal[i].length +
							(i < self.#linesInternal.length - 1
								? self.#eolInternal.length
								: 0);
					}

					totalOffset += position.character;

					// Calculate full document text length for capping
					const fullTextLength = self.#linesInternal.reduce(
						(sum, line, idx) =>
							sum +
							line.length +
							(idx < self.#linesInternal.length - 1
								? self.#eolInternal.length
								: 0),

						0,
					);

					return Math.min(totalOffset, fullTextLength);
				}

				return (
					self.#lineStartsInternal[position.line] + position.character
				);
			},

			positionAt: (offset: number): VscodePosition => {
				offset = Math.max(0, Math.floor(offset));

				self.#ensureLineStartsAvailable();

				if (!self.#lineStartsInternal)
					throw new Error(
						"Internal error: Line starts cache not available.",
					);

				let low = 0,
					high = self.#lineStartsInternal.length,
					mid = 0,
					lineStartOffset = 0;

				while (low < high) {
					mid = low + Math.floor((high - low) / 2);

					lineStartOffset = self.#lineStartsInternal[mid];

					if (offset >= lineStartOffset) low = mid + 1;
					else high = mid;
				}

				const lineIndex = Math.max(0, low - 1);

				if (lineIndex >= self.#linesInternal.length) {
					const lastLine = Math.max(
						0,

						self.#linesInternal.length - 1,
					);

					return new VscodePosition(
						lastLine,

						self.#linesInternal[lastLine]?.length ?? 0,
					);
				}

				lineStartOffset = self.#lineStartsInternal[lineIndex];

				const character = Math.min(
					offset - lineStartOffset,

					self.#linesInternal[lineIndex]?.length ?? 0,
				);

				return new VscodePosition(lineIndex, character);
			},

			getText: (range?: VscodeRange): string => {
				if (!range) return self.#linesInternal.join(self.#eolInternal);

				range = self._validateRangeApi(range);

				if (range.isEmpty) return "";

				const { start, end } = range;

				if (start.line === end.line) {
					return self.#linesInternal[start.line].substring(
						start.character,

						end.character,
					);
				}

				const resultLines: string[] = [
					self.#linesInternal[start.line].substring(start.character),
				];

				for (let i = start.line + 1; i < end.line; i++) {
					resultLines.push(self.#linesInternal[i]);
				}

				resultLines.push(
					self.#linesInternal[end.line].substring(0, end.character),
				);

				return resultLines.join(self.#eolInternal);
			},

			getWordRangeAtPosition: (
				position: VscodePosition,

				regex?: RegExp,
			): VscodeRange | undefined => {
				position = self._validatePositionApi(position);

				const lineText = self.#linesInternal[position.line];

				// Should not happen if position is validated
				if (lineText === undefined) return undefined;

				const wordDefinition = ensureValidWordDefinitionInternal(
					regex || DEFAULT_WORD_REGEXP_FALLBACK,
				);

				if (getWordAtTextInternal) {
					try {
						// getWordAtTextInternal's `column` parameter is 1-based.
						const wordAt = getWordAtTextInternal(
							position.character + 1,

							wordDefinition,

							lineText,

							0,
						);

						if (wordAt) {
							// wordAt.startColumn and wordAt.endColumn are 1-based.
							return new VscodeRange(
								position.line,

								wordAt.startColumn - 1,

								position.line,

								wordAt.endColumn - 1,
							);
						}
					} catch (e: any) {
						self._logShimError(
							"Error using internal getWordAtText for getWordRangeAtPosition:",

							e,
						);

						// Fallback to simpler regex match if internal helper fails
					}
				}

				// Fallback regex logic (if getWordAtTextInternal is not available or failed)
				// Reset regex state
				wordDefinition.lastIndex = 0;

				let match: RegExpExecArray | null;

				while ((match = wordDefinition.exec(lineText))) {
					const startIndex = match.index;

					const endIndex = startIndex + match[0].length;

					if (
						startIndex <= position.character &&
						endIndex >= position.character
					) {
						return new VscodeRange(
							position.line,

							startIndex,

							position.line,

							endIndex,
						);
					}

					if (
						wordDefinition.lastIndex === startIndex &&
						match[0].length === 0
					)
						// Avoid infinite loop on empty match
						break;
				}

				return undefined;
			},

			validateRange: (range: VscodeRange): VscodeRange =>
				self._validateRangeApi(range),

			validatePosition: (position: VscodePosition): VscodePosition =>
				self._validatePositionApi(position),
		};

		return Object.freeze(textDoc);
	}

	// --- Validation helpers using 0-based VscodePosition/VscodeRange ---
	private _validatePositionApi(position: VscodePosition): VscodePosition {
		if (!(position instanceof VscodePosition))
			throw new TypeError("Invalid argument: Not a VscodePosition");

		let { line, character } = position;

		let changed = false;

		if (line < 0) {
			line = 0;

			character = 0;

			changed = true;
		}

		const lineCount = this.#linesInternal.length;

		if (line >= lineCount) {
			line = Math.max(0, lineCount - 1);

			character = this.#linesInternal[line]?.length ?? 0;

			changed = true;
		} else {
			const maxCharacter = this.#linesInternal[line].length;

			if (character < 0) {
				character = 0;

				changed = true;
			}

			if (character > maxCharacter) {
				character = maxCharacter;

				changed = true;
			}
		}

		return changed ? new VscodePosition(line, character) : position;
	}

	private _validateRangeApi(range: VscodeRange): VscodeRange {
		if (!(range instanceof VscodeRange))
			throw new TypeError("Invalid argument: Not a VscodeRange");

		const start = this._validatePositionApi(range.start);

		const end = this._validatePositionApi(range.end);

		if (start === range.start && end === range.end) return range;

		return new VscodeRange(start, end);
	}

	// --- Public getters for CocoonDocumentService (used by constructor and potentially others) ---
	get uri(): VscodeApiUri {
		return this.#uriAdapter;
	}

	get version(): number {
		return this.#versionIdInternal;
	}

	get languageId(): string {
		return self.#languageIdInternal;
	}

	get encoding(): string {
		return self.#encodingInternal;
	}

	/** Disposes of resources held by this document data instance. (Currently a NOP) */
	public dispose(): void {
		// this._logShimMessage(`Disposing document data for URI='${this.#uriAdapter.toString()}'`);
		// No specific resources (like event listeners) are held directly by CocoonDocumentData
		// that require explicit disposal beyond what garbage collection handles once it's removed from the cache.
	}
}
