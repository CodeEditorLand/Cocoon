/*---------------------------------------------------------------------------------------------
 * Cocoon Document Shim Service (shims/document-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements a service similar to VS Code's `IExtHostDocumentsAndEditors` (simplified to
 * IExtHostDocuments for Cocoon's initial focus). It manages `CocoonDocumentData`
 * instances, representing open text documents, and synchronizes their state with Mountain.
 *
 * Responsibilities:
 * - `CocoonDocumentService` (was ShimDocumentService):
 *   - Manages a map of URI strings to `CocoonDocumentData` instances.
 *   - Provides `getDocument()`, `getAllDocumentData()`, `getTextDocuments()` (API).
 *   - Exposes `vscode.workspace` document lifecycle events by firing Emitters.
 *   - Implements RPC methods (now part of `ExtHostDocumentsShape` from protocol)
 *     called by Mountain like `$acceptDocumentsAndEditorsDelta` or individual
 *     `$acceptModelAdded`, `$acceptModelRemoved`, etc., to update document states.
 * - `CocoonDocumentData` (was ShimDocumentData):
 *   - Represents a single document's state (URI, lines, version, language, dirty, etc.).
 *   - Provides the `vscode.TextDocument` API facade.
 *   - Handles applying content changes (`_acceptContentChanges`).
 *   - `save()` method proxies to `MainThreadDocumentsShape`.
 *
 * Key Interactions:
 * - Provides `vscode.workspace.textDocuments` and document events.
 * - Receives state updates from Mountain via RPC calls defined in `ExtHostDocumentsShape`
 *   (or `ExtHostDocumentsAndEditorsShape`).
 * - `CocoonDocumentData.save()` calls `$trySaveDocument` on `MainThreadDocumentsShape`.
 * - Relies on `vscode` API types and VS Code internal utility functions.
 *--------------------------------------------------------------------------------------------*/

// Assuming from 'vscode' API shim
import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
import {
	DisposableStore,
	type IDisposable,
	dispose,
} from "vs/base/common/lifecycle";
// VS Code internal utility
import { splitLines } from "vs/base/common/strings";
import {
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
import {
	// RPC Contexts
	ExtHostContext,
	MainContext,
	// If using the combined delta
	IDocumentsAndEditorsDelta as RpcDocumentsAndEditorsDelta,
	// From extHost.protocol.ts (or local definitions if not directly importable)
	IModelAddedData as RpcModelAddedData,
	// Contains versionId, changes, eol, etc.
	type IModelChangedEvent as RpcModelChangedEvent,
	type IModelContentChange as RpcModelContentChange,
	ExtHostDocumentsAndEditorsShape as VscodeExtHostDocumentsAndEditorsShape,
	// RPC methods on this service called by main
	type ExtHostDocumentsShape as VscodeExtHostDocumentsShape,
	// RPC proxy to main thread
	type MainThreadDocumentsShape as VscodeMainThreadDocumentsShape,
} from "vs/workbench/api/common/extHost.protocol";

import {
	EndOfLine as VscodeEndOfLine,
	Position as VscodePosition,
	Range as VscodeRange,
	type TextDocument as VscodeTextDocument,
	type TextDocumentChangeEvent as VscodeTextDocumentChangeEvent,
	type TextDocumentContentChangeEvent as VscodeTextDocumentContentChangeEvent,
	type TextLine as VscodeTextLine,
	Uri as VscodeUri,
	// Not directly used in TextDocument API here
	// Location as VscodeLocation,
	// For more complex changes
	// TextEdit as VscodeTextEdit,
} from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	type IExtHostRpcService,
	type ILogService,
	type ProxyIdentifier,
	refineError,
} from "./_baseShim";

// Word helpers (from original JS, assuming these are still the best available source for Cocoon)
// TODO: If VS Code's full `vs/editor/common/core/wordHelper` can be bundled and used, prefer that.
let getWordAtTextInternal:
	| ((
			column: number,

			wordDefinition: RegExp,

			text: string,

			textOffset: number,
	  ) => { word: string; startColumn: number; endColumn: number } | null)
	| null = null;

let ensureValidWordDefinitionInternal:
	| ((wordDefinition?: RegExp) => RegExp)
	| null = null;

try {
	const wordHelper = require("vs/editor/common/core/wordHelper");

	getWordAtTextInternal = wordHelper.getWordAtText;

	ensureValidWordDefinitionInternal = wordHelper.ensureValidWordDefinition;
} catch (e) {
	/* Fallback below */
}

const DEFAULT_WORD_REGEXP_FALLBACK =
	/(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;

if (!ensureValidWordDefinitionInternal) {
	ensureValidWordDefinitionInternal = (wordDefinition?: RegExp): RegExp => {
		let result = DEFAULT_WORD_REGEXP_FALLBACK;

		if (wordDefinition instanceof RegExp) {
			if (!wordDefinition.global) {
				let flags = "g";

				if (wordDefinition.ignoreCase) flags += "i";

				if (wordDefinition.multiline) flags += "m";

				if (wordDefinition.unicode) flags += "u";

				result = new RegExp(wordDefinition.source, flags);
			} else {
				result = wordDefinition;
			}
		}

		result.lastIndex = 0;

		return result;
	};
}

// --- Type Definitions ---

// MainThreadDocumentsShape might be part of a larger MainThreadDocumentsAndEditorsShape
// TODO: Ensure this aligns with the actual proxy obtained.
type MainThreadDocumentsProxy = Pick<
	VscodeMainThreadDocumentsShape,
	"$tryCreateDocument" | "$tryOpenDocument" | "$trySaveDocument"
>;

// If combined delta is used, we need MainThreadTextEditors for editor part.
// type MainThreadTextEditorsProxy = Pick<VscodeMainThreadTextEditorsShape, ...>;

// Forward declaration for CocoonDocumentService
class CocoonDocumentService
	extends BaseCocoonShim
	implements VscodeExtHostDocumentsShape
{
	// For IExtHostDocuments/* or VscodeExtHostDocumentsAndEditorsShape */ public readonly
	_serviceBrand: undefined;

	readonly #mainThreadDocumentsProxy: MainThreadDocumentsProxy | null = null;

	// Using ResourceMap from VS Code is better for URI-keyed maps if available.
	// For simplicity, string key from uri.toString() is used.
	// Key: uri.toString() (VscodeApiUri)
	readonly #documents = new Map<string, CocoonDocumentData>();

	readonly #onDidAddDocumentEmitter = new VscodeEmitter<VscodeTextDocument>();

	readonly #onDidRemoveDocumentEmitter =
		new VscodeEmitter<VscodeTextDocument>();

	readonly #onDidChangeDocumentEmitter =
		new VscodeEmitter<VscodeTextDocumentChangeEvent>();

	readonly #onDidSaveDocumentEmitter =
		new VscodeEmitter<VscodeTextDocument>();

	readonly #instanceDisposables = new DisposableStore();

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		// Service ID for logging
		super("ExtHostDocuments", rpcService, logService);

		if (this._rpcService) {
			this.#mainThreadDocumentsProxy = this._getProxy(
				MainContext.MainThreadDocuments as ProxyIdentifier<MainThreadDocumentsProxy>,
			);

			// If handling editors too, would get MainThreadTextEditors proxy
			// this.#mainThreadEditorsProxy = this._getProxy(MainContext.MainThreadTextEditors);

			// Register self for RPC calls from MainThread
			// Choose one: VscodeExtHostDocumentsShape or VscodeExtHostDocumentsAndEditorsShape
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostDocuments as ProxyIdentifier<VscodeExtHostDocumentsShape>,

					this,
				);

				// OR if using combined delta:
				// this._rpcService.set(ExtHostContext.ExtHostDocumentsAndEditors as ProxyIdentifier<VscodeExtHostDocumentsAndEditorsShape>, this);

				this._log(
					"Registered self for incoming RPC calls from MainThreadDocuments/Editors.",
				);
			} catch (e: any) {
				this._logError("Failed to set self for RPC:", e);
			}
		}

		if (!this.#mainThreadDocumentsProxy)
			this._logError(
				"MainThreadDocuments proxy NOT obtained. Document operations (save, etc.) will fail.",
			);
	}

	public getMainThreadDocumentsProxy(): MainThreadDocumentsProxy | null {
		return this.#mainThreadDocumentsProxy;
	}

	// --- IExtHostDocuments API ---
	public getDocumentData(uri: VscodeApiUri): CocoonDocumentData | undefined {
		if (!(uri instanceof VscodeApiUri)) {
			this._logWarn("getDocumentData called with non-VscodeApiUri:", uri);

			return undefined;
		}

		return this.#documents.get(uri.toString());
	}

	public getAllDocumentData(): readonly CocoonDocumentData[] {
		return Object.freeze([...this.#documents.values()]);
	}

	// --- vscode.workspace API parts ---
	public getTextDocuments(): readonly VscodeTextDocument[] {
		return this.getAllDocumentData().map((d) => d.document);
	}

	public readonly onDidOpenTextDocument: VscodeEvent<VscodeTextDocument> =
		this.#onDidAddDocumentEmitter.event;

	public readonly onDidCloseTextDocument: VscodeEvent<VscodeTextDocument> =
		this.#onDidRemoveDocumentEmitter.event;

	public readonly onDidChangeTextDocument: VscodeEvent<VscodeTextDocumentChangeEvent> =
		this.#onDidChangeDocumentEmitter.event;

	public readonly onDidSaveTextDocument: VscodeEvent<VscodeTextDocument> =
		this.#onDidSaveDocumentEmitter.event;

	// --- RPC Methods ($accept... from VscodeExtHostDocumentsShape) ---
	// These are called by the MainThread to inform about changes.
	// VS Code often uses a single $acceptDocumentsAndEditorsDelta.
	// If Mountain sends individual $acceptModelAdded etc., implement those.
	// The provided extHost.protocol.ts has individual methods on ExtHostDocumentsShape.

	// Corresponds to RpcModelAddedData
	public $acceptModelAdded(
		uriComponents: VSCodeInternalUriComponents,

		eol: string,

		versionId: number,

		lines: string[],

		languageId: string,

		isDirty: boolean,

		encoding: string,
	): void {
		const revivedUri = this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedUri) {
			this._logError(
				"$acceptModelAdded: Failed to revive URI",

				uriComponents,
			);

			return;
		}

		const uriStr = revivedUri.toString();

		if (this.#documents.has(uriStr)) {
			this._logWarn(
				`$acceptModelAdded: Document already exists ${uriStr}`,
			);

			return;
		}

		this._log(
			`$acceptModelAdded: ${uriStr}, V${versionId}, Lang=${languageId}, Dirty=${isDirty}, Enc=${encoding}`,
		);

		const data = new CocoonDocumentData(
			this,

			revivedUri,

			lines,

			eol,

			languageId,

			versionId,

			isDirty,

			encoding,

			this._logService,
		);

		this.#documents.set(uriStr, data);

		this.#onDidAddDocumentEmitter.fire(data.document);
	}

	public $acceptModelRemoved(
		uriComponents: VSCodeInternalUriComponents,
	): void {
		const revivedUri = this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedUri) {
			this._logError(
				"$acceptModelRemoved: Failed to revive URI",

				uriComponents,
			);

			return;
		}

		const uriStr = revivedUri.toString();

		const data = this.#documents.get(uriStr);

		if (data) {
			this._log(`$acceptModelRemoved: ${uriStr}`);

			data._markAsClosedInternal();

			this.#documents.delete(uriStr);

			this.#onDidRemoveDocumentEmitter.fire(data.document);

			// Dispose the document data instance
			dispose(data);
		} else {
			this._logWarn(`$acceptModelRemoved: Document not found ${uriStr}`);
		}
	}

	// Corresponds to RpcModelChangedEvent for content changes
	public $acceptModelChanged(
		uriComponents: VSCodeInternalUriComponents,

		eventData: RpcModelChangedEvent,

		isDirty: boolean,
	): void {
		const revivedUri = this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedUri) {
			this._logError(
				"$acceptModelChanged: Failed to revive URI",

				uriComponents,
			);

			return;
		}

		const uriStr = revivedUri.toString();

		const docData = this.#documents.get(uriStr);

		if (docData) {
			if (docData.version >= eventData.versionId) {
				this._logWarn(
					`$acceptModelChanged: Stale event V${eventData.versionId} for ${uriStr} (current: V${docData.version}). Updating dirty state only.`,
				);

				// Still update dirty state as per VS Code logic
				docData._acceptIsDirtyInternal(isDirty);

				return;
			}

			this._log(
				`$acceptModelChanged: ${uriStr} V${eventData.versionId}, ${eventData.changes.length} changes, Dirty=${isDirty}, EOL='${eventData.eol}'`,
			);

			const oldVersion = docData.version;

			const contentChanged = docData._acceptContentChangesInternal(
				eventData.versionId,

				eventData.changes,

				eventData.eol,
			);

			const dirtinessChanged = docData._acceptIsDirtyInternal(isDirty);

			if (!contentChanged && !dirtinessChanged) {
				this._log(
					`$acceptModelChanged: No effective change for ${uriStr} V${eventData.versionId}.`,
				);

				return;
			}

			const vscodeContentChanges: VscodeTextDocumentContentChangeEvent[] =
				eventData.changes.map((change) => ({
					// Use VS Code's typeConverter
					range: typeConverters.Range.to(change.range),

					rangeOffset: change.rangeOffset,

					rangeLength: change.rangeLength,

					text: change.text,
				}));

			this.#onDidChangeDocumentEmitter.fire(
				Object.freeze({
					document: docData.document,

					contentChanges: Object.freeze(
						vscodeContentChanges,
					) as readonly VscodeTextDocumentContentChangeEvent[],

					reason: eventData.isUndoing
						? TextDocumentChangeReason.Undo
						: eventData.isRedoing
							? TextDocumentChangeReason.Redo
							: undefined,
				}),
			);
		} else {
			this._logWarn(`$acceptModelChanged: Document not found ${uriStr}`);
		}
	}

	public $acceptModelSaved(uriComponents: VSCodeInternalUriComponents): void {
		const revivedUri = this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedUri) {
			this._logError(
				"$acceptModelSaved: Failed to revive URI",

				uriComponents,
			);

			return;
		}

		const uriStr = revivedUri.toString();

		const data = this.#documents.get(uriStr);

		if (data) {
			this._log(`$acceptModelSaved: ${uriStr}`);

			// Saved implies not dirty
			data._acceptIsDirtyInternal(false);

			this.#onDidSaveDocumentEmitter.fire(data.document);

			// Note: onDidChangeTextDocument might also fire if dirty state change is considered a document change
		} else {
			this._logWarn(`$acceptModelSaved: Document not found ${uriStr}`);
		}
	}

	public $acceptDirtyStateChanged(
		uriComponents: VSCodeInternalUriComponents,

		isDirty: boolean,
	): void {
		const revivedUri = this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedUri) {
			this._logError(
				"$acceptDirtyStateChanged: Failed to revive URI",

				uriComponents,
			);

			return;
		}

		const uriStr = revivedUri.toString();

		const data = this.#documents.get(uriStr);

		if (data) {
			this._log(
				`$acceptDirtyStateChanged: ${uriStr} -> isDirty=${isDirty}`,
			);

			const dirtinessReallyChanged = data._acceptIsDirtyInternal(isDirty);

			// VS Code only fires onDidChangeTextDocument if dirtiness *actually* changes,

			// and it's often part of a model content change or save operation, not standalone.
			// For simplicity, if this method is called, we can assume a state change that might need notifying.
			if (dirtinessReallyChanged) {
				this.#onDidChangeDocumentEmitter.fire(
					Object.freeze({
						document: data.document,

						contentChanges: Object.freeze(
							[],
						) as readonly VscodeTextDocumentContentChangeEvent[],

						// No specific reason for just dirty state change
						reason: undefined,
					}),
				);
			}
		} else {
			this._logWarn(
				`$acceptDirtyStateChanged: Document not found ${uriStr}`,
			);
		}
	}

	public $acceptModelLanguageChanged(
		uriComponents: VSCodeInternalUriComponents,

		newLanguageId: string,
	): void {
		const revivedUri = this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedUri) {
			this._logError(
				"$acceptModelLanguageChanged: Failed to revive URI",

				uriComponents,
			);

			return;
		}

		const uriStr = revivedUri.toString();

		const data = this.#documents.get(uriStr);

		if (data) {
			this._log(
				`$acceptModelLanguageChanged: ${uriStr} from '${data.languageId}' to '${newLanguageId}'`,
			);

			const languageReallyChanged =
				data._acceptLanguageIdInternal(newLanguageId);

			if (languageReallyChanged) {
				// TODO: VS Code fires a specific LanguageChangeEvent or includes it in onDidChangeTextDocument.
				// For simplicity, firing onDidChangeTextDocument with no content changes.
				this.#onDidChangeDocumentEmitter.fire(
					Object.freeze({
						document: data.document,

						contentChanges: Object.freeze(
							[],
						) as readonly VscodeTextDocumentContentChangeEvent[],

						reason: undefined,
					}),
				);
			}
		} else {
			this._logWarn(
				`$acceptModelLanguageChanged: Document not found ${uriStr}`,
			);
		}
	}

	public $acceptEncodingChanged(
		uriComponents: VSCodeInternalUriComponents,

		newEncoding: string,
	): void {
		// This method is not standard on VscodeExtHostDocumentsShape, but was in original Cocoon document-shim.
		// It might be a custom notification.
		const revivedUri = this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedUri) {
			this._logError(
				"$acceptEncodingChanged: Failed to revive URI",

				uriComponents,
			);

			return;
		}

		const uriStr = revivedUri.toString();

		const data = this.#documents.get(uriStr);

		if (data) {
			this._log(
				`$acceptEncodingChanged: ${uriStr} from '${data.encoding}' to '${newEncoding}'`,
			);

			const encodingReallyChanged =
				data._acceptEncodingInternal(newEncoding);

			if (encodingReallyChanged) {
				// TODO: How to notify extensions? There's no standard vscode event for encoding change on TextDocument.
				// This might be an internal state update.
			}
		} else {
			this._logWarn(
				`$acceptEncodingChanged: Document not found ${uriStr}`,
			);
		}
	}

	// --- URI Conversion Helpers (DTO <-> VscodeApiUri) ---
	private _reviveUriDtoToVscodeApiUri(
		uriDto: VSCodeInternalUriComponents | undefined,
	): VscodeApiUri | undefined {
		if (!uriDto) return undefined;

		try {
			const internalUri = VSCodeInternalURI.revive(uriDto);

			// Convert vs/base/common/uri.URI to vscode.Uri
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

	private _vscodeApiUriToDto(
		uri: VscodeApiUri,
	): VSCodeInternalUriComponents | undefined {
		// Use BaseCocoonShim's marshaller, ensuring it produces VSCodeInternalUriComponents
		// From BaseCocoonShim
		const components = this._convertApiArgToInternal(uri);

		if (components && components.$mid === MarshalledId.UriSimple) {
			// Check for VS Code's marshalling marker
			return components as VSCodeInternalUriComponents;
		}

		this._logError(
			"Failed to convert VscodeApiUri to DTO via base marshaller for document operations.",

			uri,
		);

		// Fallback: Manually construct if base marshaller isn't producing the exact internal DTO
		try {
			const internalUri = VSCodeInternalURI.from(uri);

			return {
				scheme: internalUri.scheme,

				authority: internalUri.authority,

				path: internalUri.path,

				query: internalUri.query,

				fragment: internalUri.fragment,

				external: internalUri.toString(true),

				fsPath: internalUri.fsPath,

				$mid: 1,
			};
		} catch (e) {
			this._logError("Fallback VscodeApiUri to DTO conversion failed", e);

			return undefined;
		}
	}

	public dispose(): void {
		// If BaseCocoonShim has a dispose
		super.dispose();

		this.#instanceDisposables.dispose();

		this.#onDidAddDocumentEmitter.dispose();

		this.#onDidRemoveDocumentEmitter.dispose();

		this.#onDidChangeDocumentEmitter.dispose();

		this.#onDidSaveDocumentEmitter.dispose();

		// Dispose individual document data
		this.#documents.forEach((doc) => dispose(doc));

		this.#documents.clear();

		this._log("Disposed.");
	}
}

export class CocoonDocumentData implements IDisposable {
	// Was ShimDocumentData
	// vscode.Uri for the public API
	readonly #uriAdapter: VscodeApiUri;

	#linesInternal: string[];

	#eolInternal: string;

	#versionIdInternal: number;

	#languageIdInternal: string;

	#isDirtyInternal: boolean;

	#isClosedInternal = false;

	// Internal tracking of encoding
	#encodingInternal: string;

	#logService?: ILogService;

	// Reference to the parent service
	readonly #documentService: CocoonDocumentService;

	#lineStartsInternal: number[] | null = null;

	// The public API facade
	public readonly document: VscodeTextDocument;

	constructor(
		// Pass the service instance
		documentService: CocoonDocumentService,

		// Use vscode.Uri for API consistency
		uri: VscodeApiUri,

		lines: string[],

		eol: string,

		languageId: string,

		versionId: number,

		isDirty: boolean,

		encoding: string,

		logService?: ILogService,
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

		// Create the API facade
		this.document = this._createTextDocumentApiObject();

		//  // Can be verbosethis._logShimOp(`Created V${this.#versionIdInternal} for ${this.
		// #uriAdapter.toString()}`);
	}

	private _logShimOp(msg: string, ...args: any[]): void {
		this.#logService?.trace(
			`[CocoonDocData][${this.#uriAdapter.fsPath || this.#uriAdapter.toString() || "unknown"}] ${msg}`,

			...args,
		);
	}

	private _logShimError(msg: string, ...args: any[]): void {
		this.#logService?.error(
			`[CocoonDocData][${this.#uriAdapter.fsPath || this.#uriAdapter.toString() || "unknown"}] ${msg}`,

			...args,
		);
	}

	private _logShimWarn(msg: string, ...args: any[]): void {
		this.#logService?.warn(
			`[CocoonDocData][${this.#uriAdapter.fsPath || this.#uriAdapter.toString() || "unknown"}] ${msg}`,

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

	public _acceptContentChangesInternal(
		newVersionId: number,

		changes: RpcModelContentChange[],

		newEol: string,
	): boolean {
		if (this.#versionIdInternal >= newVersionId) {
			this._logShimOp(
				`Skipping content changes for V${newVersionId} (current: V${this.#versionIdInternal})`,
			);

			// No change applied
			return false;
		}

		// this._logShimOp(`Applying ${changes.length} content changes, V${this.#versionIdInternal} -> V${newVersionId}, EOL '${this.#eolInternal}' -> '${newEol}'`);

		// Invalidate offset cache
		this.#lineStartsInternal = null;

		// Update EOL first
		this.#eolInternal = newEol;

		let currentLines = [...this.#linesInternal];

		// VS Code's ExtHostDocumentData applies changes in reverse order of occurrence for edits.
		// However, the `changes` array from `IModelChangedEvent` is already ordered correctly by the main thread.
		for (const change of changes) {
			// Use VS Code's typeConverter
			const range = typeConverters.Range.to(change.range);

			const text = change.text;

			// Simplified application: delete range then insert text at start of range.
			// A more robust implementation would handle overlapping changes or use a PieceTree-like structure.
			currentLines = this._applyDeleteRangeApi(currentLines, range);

			currentLines = this._applyInsertTextApi(
				currentLines,

				range.start,

				text,
			);
		}

		this.#linesInternal = currentLines;

		this.#versionIdInternal = newVersionId;

		// Content changed
		return true;
	}

	// Helper methods for applying changes (using API types)
	private _applyDeleteRangeApi(
		lines: string[],

		range: VscodeRange,
	): string[] {
		/* ... (implementation from previous conversion, ensure it uses VscodeRange/Position) ... */
		if (range.isEmpty) return lines;

		const currentLines = [...lines];

		const { start, end } = range;

		if (start.line === end.line) {
			const lineText = currentLines[start.line];

			currentLines[start.line] =
				lineText.substring(0, start.character) +
				lineText.substring(end.character);
		} else {
			const firstLineText = currentLines[start.line];

			const lastLineText = currentLines[end.line];

			currentLines[start.line] =
				firstLineText.substring(0, start.character) +
				lastLineText.substring(end.character);

			currentLines.splice(start.line + 1, end.line - start.line);
		}

		return currentLines;
	}

	private _applyInsertTextApi(
		lines: string[],

		position: VscodePosition,

		text: string,
	): string[] {
		/* ... (implementation from previous conversion, ensure it uses VscodeRange/Position) ... */
		if (!text) return lines;

		const currentLines = [...lines];

		const { line, character } = position;

		const normalizedText = text.replace(/\r\n|\n|\r/g, this.#eolInternal);

		// VS Code utility
		const insertTextLines = splitLines(normalizedText);

		if (insertTextLines.length === 1) {
			const lineText = currentLines[line];

			currentLines[line] =
				lineText.substring(0, character) +
				insertTextLines[0] +
				lineText.substring(character);
		} else {
			const lineText = currentLines[line];

			const textAfterInsert = lineText.substring(character);

			currentLines[line] =
				lineText.substring(0, character) + insertTextLines[0];

			const remainingLinesToInsert = insertTextLines.slice(1);

			remainingLinesToInsert[remainingLinesToInsert.length - 1] +=
				textAfterInsert;

			currentLines.splice(line + 1, 0, ...remainingLinesToInsert);
		}

		return currentLines;
	}

	// --- Line Start Offset Cache ---
	#ensureLineStartsAvailable(): void {
		if (this.#lineStartsInternal === null) {
			const eolLength = this.#eolInternal.length;

			let currentOffset = 0;

			const R = [0];

			for (let i = 0; i < this.#linesInternal.length; i++) {
				currentOffset += this.#linesInternal[i].length + eolLength;

				R.push(currentOffset);
			}

			this.#lineStartsInternal = R;
		}
	}

	// --- vscode.TextDocument API Implementation ---
	private _createTextDocumentApiObject(): VscodeTextDocument {
		// Capture 'this' (CocoonDocumentData instance)
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
				// this._logShimOp(`save() called for ${self.#uriAdapter.toString()}`);

				if (self.#isClosedInternal) {
					this._logShimError("Document already closed, cannot save.");

					return false;
				}

				const proxy =
					self.#documentService.getMainThreadDocumentsProxy();

				if (!proxy) {
					this._logShimError(
						"Cannot save, MainThreadDocuments proxy unavailable.",
					);

					return false;
				}

				try {
					// Convert vscode.Uri to DTO for RPC
					const uriDto = (
						self.#documentService as any as BaseCocoonShim
					)._convertApiArgToInternal(self.#uriAdapter);

					if (!uriDto) {
						this._logShimError(
							"Failed to convert URI to DTO for save.",
						);

						return false;
					}

					const success = await proxy.$trySaveDocument(uriDto);

					// MainThread will call $acceptModelSaved which updates dirty flag and fires event
					return success;
				} catch (e: any) {
					this._logShimError(
						`Error during save proxy call:`,

						refineError(e, self.#logService),
					);

					return false;
				}
			},

			lineAt: (
				lineOrPosition: number | VscodePosition,
			): VscodeTextLine => {
				const line =
					typeof lineOrPosition === "number"
						? lineOrPosition
						: lineOrPosition.line;

				if (line < 0 || line >= self.#linesInternal.length)
					throw new RangeError(`Illegal value for line: ${line}`);

				const text = self.#linesInternal[line];

				const range = new VscodeRange(line, 0, line, text.length);

				const rangeIncludingLineBreak =
					line < self.#linesInternal.length - 1
						? new VscodeRange(line, 0, line + 1, 0)
						: range;

				const firstNonWhitespace = text.match(/^\s*/)?.[0].length ?? 0;

				return Object.freeze({
					lineNumber: line,

					text,

					range,

					rangeIncludingLineBreak,

					firstNonWhitespaceCharacterIndex: firstNonWhitespace,

					isEmptyOrWhitespace: firstNonWhitespace === text.length,
				});
			},

			offsetAt: (position: VscodePosition): number => {
				position = self._validatePositionApi(position);

				self.#ensureLineStartsAvailable();

				if (!self.#lineStartsInternal)
					// Should not happen
					throw new Error("Line starts cache not available.");

				if (position.line >= self.#linesInternal.length)
					return self.#lineStartsInternal[self.#linesInternal.length];

				return (
					self.#lineStartsInternal[position.line] + position.character
				);
			},

			positionAt: (offset: number): VscodePosition => {
				offset = Math.max(0, Math.floor(offset));

				self.#ensureLineStartsAvailable();

				if (!self.#lineStartsInternal)
					throw new Error("Line starts cache not available.");

				let low = 0,
					high = self.#linesInternal.length,
					mid = 0,
					lineStartOffset = 0;

				while (low < high) {
					mid = low + Math.floor((high - low) / 2);

					lineStartOffset = self.#lineStartsInternal[mid];

					if (offset >= lineStartOffset) low = mid + 1;
					else high = mid;
				}

				const lineIndex = Math.max(0, low - 1);

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

				if (start.line === end.line)
					return self.#linesInternal[start.line].substring(
						start.character,

						end.character,
					);

				const res: string[] = [
					self.#linesInternal[start.line].substring(start.character),
				];

				for (let i = start.line + 1; i < end.line; i++)
					res.push(self.#linesInternal[i]);

				res.push(
					self.#linesInternal[end.line].substring(0, end.character),
				);

				return res.join(self.#eolInternal);
			},

			getWordRangeAtPosition: (
				position: VscodePosition,

				regex?: RegExp,
			): VscodeRange | undefined => {
				position = self._validatePositionApi(position);

				const lineText = self.#linesInternal[position.line];

				if (!lineText) return undefined;

				const wordDefinition =
					regex ||
					(ensureValidWordDefinitionInternal
						? ensureValidWordDefinitionInternal(undefined)
						: DEFAULT_WORD_REGEXP_FALLBACK);

				if (
					getWordAtTextInternal &&
					ensureValidWordDefinitionInternal
				) {
					try {
						// VS Code's wordHelper.getWordAtText(column, wordDefinition, text, textOffset)
						const wordAt = getWordAtTextInternal(
							position.character + 1,

							ensureValidWordDefinitionInternal(wordDefinition),

							lineText,

							0,
						);

						if (wordAt)
							return new VscodeRange(
								position.line,

								wordAt.startColumn - 1,

								position.line,

								wordAt.endColumn - 1,
							);
					} catch (e: any) {
						self._logShimError(
							"Error using getWordAtTextInternal:",

							e,
						); /* fallback below */
					}
				}

				// Fallback logic (simplified from original JS, as it was complex)
				// TODO: Ensure this fallback is robust or rely solely on VS Code's wordHelper if bundled.
				let match: RegExpExecArray | null;

				const lineRegex = new RegExp(
					wordDefinition.source,

					wordDefinition.flags.includes("g")
						? wordDefinition.flags
						: wordDefinition.flags + "g",

					// Ensure global
				);

				lineRegex.lastIndex = 0;

				while ((match = lineRegex.exec(lineText))) {
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
						lineRegex.lastIndex === startIndex &&
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

	// --- Validation helpers using VscodePosition/VscodeRange ---
	private _validatePositionApi(p: VscodePosition): VscodePosition {
		/* ... (similar to original _validatePosition, but takes/returns VscodePosition) ... */
		if (!(p instanceof VscodePosition))
			throw new TypeError("Invalid argument: Not a VscodePosition");

		let line = p.line,
			char = p.character,
			changed = false;

		if (line < 0) {
			line = 0;

			char = 0;

			changed = true;
		} else if (line >= this.#linesInternal.length) {
			line = Math.max(0, this.#linesInternal.length - 1);

			char = this.#linesInternal[line]?.length ?? 0;

			changed = true;
		} else {
			const maxChar = this.#linesInternal[line].length;

			if (char < 0) {
				char = 0;

				changed = true;
			} else if (char > maxChar) {
				char = maxChar;

				changed = true;
			}
		}

		return changed ? new VscodePosition(line, char) : p;
	}

	private _validateRangeApi(r: VscodeRange): VscodeRange {
		/* ... (similar to original _validateRange, but takes/returns VscodeRange) ... */
		if (!(r instanceof VscodeRange))
			throw new TypeError("Invalid argument: Not a VscodeRange");

		const start = this._validatePositionApi(r.start);

		const end = this._validatePositionApi(r.end);

		if (start === r.start && end === r.end) return r;

		return new VscodeRange(start, end);
	}

	// --- Public getters for CocoonDocumentService ---
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

		// Expose encoding if needed internally by other shims
	}

	dispose(): void {
		// this._logShimOp(`Disposing document data for ${this.#uriAdapter.toString()}`);
		// No specific resources to dispose in this data object itself,
		// but good for IDisposable pattern if it held, e.g., event listeners.
	}
}
