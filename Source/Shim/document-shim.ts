/*---------------------------------------------------------------------------------------------
 * Cocoon Document Shim Service (document-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements `IExtHostDocumentsAndEditors` (focusing on `IExtHostDocuments`), managing
 * `TextDocument` data and lifecycle for extensions.
 *
 * - `CocoonDocumentService`: Manages `CocoonDocumentData` instances, provides
 *   `vscode.workspace.textDocuments` and document events. Handles RPC updates from Mountain.
 * - `CocoonDocumentData`: Represents a document, provides the `vscode.TextDocument` API facade.
 *   Applies content changes, proxies `save()` to MainThread.
 *
 * Key Interactions:
 * - Registered with DI as `IExtHostDocuments` / `IExtHostDocumentsAndEditors`.
 * - Provides `vscode.workspace.textDocuments` and document events via `ShimExtHostWorkspace`.
 * - Synchronizes document state with Mountain's `MainThreadDocuments` via RPC.
 * - Uses `BaseCocoonShim` and (will use) `CocoonTypeConverters`.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable, dispose, IDisposable } from "vs/base/common/lifecycle";
// Not directly used here now
// import { MarshalledId } from "vs/base/common/marshalling";

import { Schemas } from "vs/base/common/network";
import { splitLines } from "vs/base/common/strings";
import {
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
// DTO for edits
import type { IRange as VSCodeInternalIRange } from "vs/editor/common/core/range";
import {
	DEFAULT_WORD_REGEXP as DEFAULT_WORD_REGEXP_IMPORTED,
	ensureValidWordDefinition as ensureValidWordDefinitionImported,
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
import {
	TextDocumentChangeReason,
	// Renamed to avoid clash with VSCodeInternalRange
	Range as VscodeApiRange,
	Uri as VscodeApiUri,
	EndOfLine as VscodeEndOfLine,
	Position as VscodePosition,
	type TextDocument as VscodeTextDocument,
	type TextDocumentChangeEvent as VscodeTextDocumentChangeEvent,
	type TextDocumentContentChangeEvent as VscodeTextDocumentContentChangeEvent,
	type TextLine as VscodeTextLine,
} from "vscode";

// Assuming public API types from this path

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// TODO: Import from cocoon-type-converters.ts once available
// import * as CocoonTypeConverters from '../cocoon-type-converters';

// Ensure `ensureValidWordDefinitionInternal` is a non-null function.
let ensureValidWordDefinition: (wordDefinition?: RegExp) => RegExp =
	ensureValidWordDefinitionImported;

if (!ensureValidWordDefinition) {
	// Fallback definition (same as before)
	const DEFAULT_WORD_REGEXP_FALLBACK =
		/(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;

	ensureValidWordDefinition = (wordDefinition?: RegExp): RegExp => {
		let result: RegExp = DEFAULT_WORD_REGEXP_FALLBACK;

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

/**
 * Local type converter for `IRange` DTO to `VscodeApiRange`.
 * TODO: Move to `cocoon-type-converters.ts`.
 */
const localRangeDtoToApiRange = (
	rangeDto: VSCodeInternalIRange | undefined,
): VscodeApiRange => {
	// Default for safety
	if (!rangeDto) return new VscodeApiRange(0, 0, 0, 0);

	// DTO is 0-based (from extHost.protocol.ts's IModelContentChange.range)
	// VscodeApiRange constructor is also 0-based.
	return new VscodeApiRange(
		rangeDto.startLineNumber,

		rangeDto.startColumn,

		rangeDto.endLineNumber,

		rangeDto.endColumn,
	);
};

type MainThreadDocumentsProxyService = Pick<
	VscodeMainThreadDocumentsShape,
	"$tryCreateDocument" | "$tryOpenDocument" | "$trySaveDocument"
>;

export class CocoonDocumentService
	extends BaseCocoonShim
	implements VscodeExtHostDocumentsShape
{
	public readonly _serviceBrand: undefined;

	readonly #mainThreadDocumentsProxy: MainThreadDocumentsProxyService | null =
		null;

	// Key: VscodeApiUri.toString()
	readonly #documents = new Map<string, CocoonDocumentData>();

	readonly #onDidAddDocumentEmitter = new VscodeEmitter<VscodeTextDocument>();

	readonly #onDidRemoveDocumentEmitter =
		new VscodeEmitter<VscodeTextDocument>();

	readonly #onDidChangeDocumentEmitter =
		new VscodeEmitter<VscodeTextDocumentChangeEvent>();

	readonly #onDidSaveDocumentEmitter =
		new VscodeEmitter<VscodeTextDocument>();

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostDocuments", rpcService, logService);

		this._logInfo("Initializing...");

		if (this._rpcService) {
			this.#mainThreadDocumentsProxy = this._getProxy(
				MainContext.MainThreadDocuments as ProxyIdentifier<MainThreadDocumentsProxyService>,
			);

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
				"MainThreadDocuments RPC proxy NOT obtained. Document operations will fail.",
			);
		}
	}

	public getMainThreadDocumentsProxy(): MainThreadDocumentsProxyService | null {
		return this.#mainThreadDocumentsProxy;
	}

	/**
	 * Internal helper to marshal a VscodeApiUri to UriComponents DTO for RPC.
	 * Uses the BaseCocoonShim's _convertApiArgToInternal.
	 */
	protected _marshalApiUriToDto(
		uri: VscodeApiUri,
	): VSCodeInternalUriComponents | undefined {
		const dto = this._convertApiArgToInternal(uri);

		// _convertApiArgToInternal for VscodeApiUri should produce VSCodeInternalUriComponents
		if (
			dto &&
			typeof dto === "object" &&
			"scheme" in dto &&
			"path" in dto
		) {
			return dto as VSCodeInternalUriComponents;
		}

		this._logError(
			"Failed to marshal VscodeApiUri to DTO for RPC.",

			uri,

			"Result:",

			dto,
		);

		return undefined;
	}

	public getDocumentData(uri: VscodeApiUri): CocoonDocumentData | undefined {
		if (!(uri instanceof VscodeApiUri)) {
			this._logWarn("getDocumentData called with invalid URI type.", uri);

			return undefined;
		}

		return this.#documents.get(uri.toString());
	}

	public getAllDocumentData(): readonly CocoonDocumentData[] {
		return Object.freeze([...this.#documents.values()]);
	}

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

	public $acceptModelAdded(
		uriComponents: VSCodeInternalUriComponents,

		eol: string,

		versionId: number,

		lines: string[],

		languageId: string,

		isDirty: boolean,

		// Encoding might be part of a richer DTO from MainThread in future
		_encoding_unused?: string,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptModelAdded: Failed to revive URI from DTO.",

				"DTO:",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		if (this.#documents.has(uriString)) {
			this._logWarn(
				`$acceptModelAdded: Document '${uriString}' already exists. Ignoring.`,
			);

			return;
		}

		this._logDebug(
			`$acceptModelAdded: URI='${uriString}', Version=${versionId}, Lang='${languageId}'`,
		);

		const documentData = new CocoonDocumentData(
			// Pass self for save operations
			this,

			revivedVscodeApiUri,

			lines,

			eol,

			languageId,

			versionId,

			isDirty,

			// Default encoding, TODO: use _encoding_unused or get from MainThread DTO
			"utf8",

			this._logService,

			// Pass marshaller
			(uri: VscodeApiUri) => this._marshalApiUriToDto(uri),
		);

		this.#documents.set(uriString, documentData);

		this.#onDidAddDocumentEmitter.fire(documentData.document);
	}

	public $acceptModelRemoved(
		uriComponents: VSCodeInternalUriComponents,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptModelRemoved: Failed to revive URI from DTO.",

				"DTO:",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		const documentData = this.#documents.get(uriString);

		if (documentData) {
			this._logDebug(`$acceptModelRemoved: URI='${uriString}'`);

			documentData._markAsClosedInternal();

			this.#documents.delete(uriString);

			this.#onDidRemoveDocumentEmitter.fire(documentData.document);

			dispose(documentData);
		} else {
			this._logWarn(
				`$acceptModelRemoved: Document '${uriString}' not found.`,
			);
		}
	}

	public $acceptModelChanged(
		uriComponents: VSCodeInternalUriComponents,

		// Contains versionId, changes, eol, isUndoing, isRedoing
		eventData: RpcModelChangedEvent,

		isDirty: boolean,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptModelChanged: Failed to revive URI from DTO.",

				"DTO:",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		const documentData = this.#documents.get(uriString);

		if (documentData) {
			if (
				documentData.version >= eventData.versionId &&
				eventData.versionId !== -1
			) {
				this._logWarn(
					`$acceptModelChanged: Stale event (V${eventData.versionId}) for URI '${uriString}' (current V${documentData.version}). Content changes ignored. Applying dirty state.`,
				);

				// Still update dirty flag
				documentData._acceptIsDirtyInternal(isDirty);

				return;
			}

			this._logDebug(
				`$acceptModelChanged: URI='${uriString}', NewVersion=${eventData.versionId}, Changes=${eventData.changes.length}`,
			);

			const contentChanged = documentData._acceptContentChangesInternal(
				eventData.versionId,

				eventData.changes,

				eventData.eol,
			);

			const dirtinessChanged =
				documentData._acceptIsDirtyInternal(isDirty);

			if (contentChanged || dirtinessChanged) {
				// Fire if either content or just dirtiness changed
				const vscodeContentChanges: VscodeTextDocumentContentChangeEvent[] =
					contentChanged
						? eventData.changes.map((change) => ({
								// RpcModelContentChange.range is VSCodeInternalIRange DTO (0-based)
								// Use local converter
								range: localRangeDtoToApiRange(change.range),

								rangeOffset: change.rangeOffset,

								rangeLength: change.rangeLength,

								text: change.text,
							}))
						: // Empty if only dirtiness changed
							[];

				this.#onDidChangeDocumentEmitter.fire(
					Object.freeze({
						document: documentData.document,

						contentChanges: Object.freeze(vscodeContentChanges),

						reason: eventData.isUndoing
							? TextDocumentChangeReason.Undo
							: eventData.isRedoing
								? TextDocumentChangeReason.Redo
								: undefined,
					}),
				);
			}
		} else {
			this._logWarn(
				`$acceptModelChanged: Document '${uriString}' not found.`,
			);
		}
	}

	public $acceptModelSaved(uriComponents: VSCodeInternalUriComponents): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptModelSaved: Failed to revive URI from DTO.",

				"DTO:",

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

			if (wasDirty) {
				// Fire change event if dirtiness changed
				this.#onDidChangeDocumentEmitter.fire(
					Object.freeze({
						document: documentData.document,

						contentChanges: Object.freeze([]),

						reason: undefined,
					}),
				);
			}
		} else {
			this._logWarn(
				`$acceptModelSaved: Document '${uriString}' not found.`,
			);
		}
	}

	public $acceptDirtyStateChanged(
		uriComponents: VSCodeInternalUriComponents,

		isDirty: boolean,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptDirtyStateChanged: Failed to revive URI DTO.",

				"DTO:",

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

			if (documentData._acceptIsDirtyInternal(isDirty)) {
				this.#onDidChangeDocumentEmitter.fire(
					Object.freeze({
						document: documentData.document,

						contentChanges: Object.freeze([]),

						reason: undefined,
					}),
				);
			}
		} else {
			this._logWarn(
				`$acceptDirtyStateChanged: Document '${uriString}' not found.`,
			);
		}
	}

	public $acceptModelLanguageChanged(
		uriComponents: VSCodeInternalUriComponents,

		newLanguageId: string,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptModelLanguageChanged: Failed to revive URI DTO.",

				"DTO:",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		const documentData = this.#documents.get(uriString);

		if (documentData) {
			this._logDebug(
				`$acceptModelLanguageChanged: URI='${uriString}', NewLang='${newLanguageId}'`,
			);

			if (documentData._acceptLanguageIdInternal(newLanguageId)) {
				this.#onDidChangeDocumentEmitter.fire(
					Object.freeze({
						document: documentData.document,

						contentChanges: Object.freeze([]),

						reason: undefined,
					}),
				);
			}
		} else {
			this._logWarn(
				`$acceptModelLanguageChanged: Document '${uriString}' not found.`,
			);
		}
	}

	public $acceptEncodingChanged(
		uriComponents: VSCodeInternalUriComponents,

		newEncoding: string,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptEncodingChanged: Failed to revive URI DTO.",

				"DTO:",

				uriComponents,
			);

			return;
		}

		const uriString = revivedVscodeApiUri.toString();

		const documentData = this.#documents.get(uriString);

		if (documentData) {
			this._logDebug(
				`$acceptEncodingChanged: URI='${uriString}', NewEncoding='${newEncoding}'`,
			);

			documentData._acceptEncodingInternal(newEncoding);

			// No standard public event for encoding change alone.
		} else {
			this._logWarn(
				`$acceptEncodingChanged: Document '${uriString}' not found.`,
			);
		}
	}

	private _reviveUriDtoToVscodeApiUri(
		uriDto: VSCodeInternalUriComponents | undefined,
	): VscodeApiUri | undefined {
		if (!uriDto) return undefined;

		try {
			// _reviveApiArgument should handle this correctly as BaseCocoonShim now uses VSCodeInternalURI.revive
			// and then VscodeApiUri.from for URI DTOs.
			return this._reviveApiArgument<VscodeApiUri>(uriDto);
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

	public override dispose(): void {
		super.dispose();

		this.#onDidAddDocumentEmitter.dispose();

		this.#onDidRemoveDocumentEmitter.dispose();

		this.#onDidChangeDocumentEmitter.dispose();

		this.#onDidSaveDocumentEmitter.dispose();

		dispose([...this.#documents.values()]);

		this.#documents.clear();

		this._logInfo(
			"Disposed and cleared all document data and event emitters.",
		);
	}
}

export class CocoonDocumentData implements IDisposable {
	readonly #uriAdapter: VscodeApiUri;

	#linesInternal: string[];

	#eolInternal: string;

	#versionIdInternal: number;

	#languageIdInternal: string;

	#isDirtyInternal: boolean;

	#isClosedInternal = false;

	#encodingInternal: string;

	#logService?: ILogServiceForShim;

	// For save and URI marshalling access
	readonly #documentService: CocoonDocumentService;

	readonly #uriMarshaller: (
		uri: VscodeApiUri,

		// Injected
	) => VSCodeInternalUriComponents | undefined;

	#lineStartsInternal: number[] | null = null;

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

		logService: ILogServiceForShim | undefined,

		uriMarshaller: (
			uri: VscodeApiUri,

			// Injected marshaller
		) => VSCodeInternalUriComponents | undefined,
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

		this.#uriMarshaller = uriMarshaller;

		this.document = this._createTextDocumentApiObject();

		this._logDocDataDebug(
			`Created: Version=${this.#versionIdInternal}, Encoding='${this.#encodingInternal}'`,
		);
	}

	private _logDocDataDebug(message: string, ...args: any[]): void {
		this.#logService?.debug(
			`[CocoonDocData][${this.#uriAdapter.fsPath || this.#uriAdapter.toString()}] ${message}`,

			...args,
		);
	}

	private _logDocDataError(message: string | Error, ...args: any[]): void {
		this.#logService?.error(
			`[CocoonDocData][${this.#uriAdapter.fsPath || this.#uriAdapter.toString()}] ${message instanceof Error ? message : message}`,

			...args,
		);
	}

	private _logDocDataWarn(message: string, ...args: any[]): void {
		this.#logService?.warn(
			`[CocoonDocData][${this.#uriAdapter.fsPath || this.#uriAdapter.toString()}] ${message}`,

			...args,
		);
	}

	public _acceptLanguageIdInternal(newLanguageId: string): boolean {
		/* ... (no change from original) ... */
		if (this.#languageIdInternal !== newLanguageId) {
			this.#languageIdInternal = newLanguageId;

			return true;
		}

		return false;
	}

	public _acceptIsDirtyInternal(newIsDirty: boolean): boolean {
		/* ... (no change from original) ... */
		if (this.#isDirtyInternal !== newIsDirty) {
			this.#isDirtyInternal = newIsDirty;

			return true;
		}

		return false;
	}

	public _acceptEncodingInternal(newEncoding: string): boolean {
		/* ... (no change from original) ... */
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
		let eolChanged = false;

		if (this.#eolInternal !== newEol) {
			this.#eolInternal = newEol;

			this.#lineStartsInternal = null;

			eolChanged = true;
		}

		if (this.#versionIdInternal >= newVersionId && newVersionId !== -1) {
			this._logDocDataDebug(
				`Skipping content changes for V${newVersionId} (current V${this.#versionIdInternal}). EOL change: ${eolChanged}.`,
			);

			return eolChanged;
		}

		this.#lineStartsInternal = null;

		let currentLinesSnapshot = [...this.#linesInternal];

		for (const change of changes) {
			// Use local converter
			const vscodeRange = localRangeDtoToApiRange(change.range);

			currentLinesSnapshot = this._applyDeleteRangeApi(
				currentLinesSnapshot,

				vscodeRange,
			);

			currentLinesSnapshot = this._applyInsertTextApi(
				currentLinesSnapshot,

				vscodeRange.start,

				change.text,
			);
		}

		this.#linesInternal = currentLinesSnapshot;

		this.#versionIdInternal = newVersionId;

		return true;
	}

	private _applyDeleteRangeApi(
		lines: string[],

		range: VscodeApiRange,
	): string[] {
		/* ... (no change from original) ... */
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
		/* ... (no change from original, uses splitLines) ... */
		if (!text) return lines;

		const currentDocLines = [...lines];

		const { line, character } = position;

		const normalizedTextToInsert = text.replace(
			/\r\n|\n|\r/g,

			this.#eolInternal,
		);

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

	#ensureLineStartsAvailable(): void {
		/* ... (no change from original) ... */
		if (this.#lineStartsInternal === null) {
			const eolCharacterLength = this.#eolInternal.length;

			let currentOffset = 0;

			const r: number[] = [0];

			for (let i = 0; i < this.#linesInternal.length - 1; i++) {
				currentOffset +=
					this.#linesInternal[i].length + eolCharacterLength;

				r.push(currentOffset);
			}

			this.#lineStartsInternal = r;
		}
	}

	private _createTextDocumentApiObject(): VscodeTextDocument {
		// For closures
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

			get encoding() {
				return self.#encodingInternal;

				// Expose encoding if it's a custom API extension
			},

			save: async (): Promise<boolean> => {
				if (self.#isClosedInternal) {
					self._logDocDataError(
						"Document.save() called on a closed document.",
					);

					return false;
				}

				const proxy =
					self.#documentService.getMainThreadDocumentsProxy();

				if (!proxy) {
					self._logDocDataError(
						"Cannot save: MainThreadDocuments RPC proxy unavailable.",
					);

					return false;
				}

				try {
					// Use the injected URI marshaller
					const uriDto = self.#uriMarshaller(self.#uriAdapter);

					if (!uriDto) {
						self._logDocDataError(
							"Failed to marshal document URI for save operation.",
						);

						return false;
					}

					const success = await proxy.$trySaveDocument(uriDto);

					// MainThread will call $acceptModelSaved, updating dirty flag & firing event.
					return success;
				} catch (e: any) {
					self._logDocDataError(
						"Error during document save RPC:",

						refineErrorForShim(
							e,

							self.#logService,

							"document.save",
						),
					);

					return false;
				}
			},

			lineAt: (
				lineOrPosition: number | VscodePosition,
			): VscodeTextLine => {
				/* ... (no change from original) ... */
				const lineIndex =
					typeof lineOrPosition === "number"
						? lineOrPosition
						: lineOrPosition.line;

				if (lineIndex < 0 || lineIndex >= self.#linesInternal.length) {
					throw new RangeError(
						`Illegal value for line number: ${lineIndex}`,
					);
				}

				const lineText = self.#linesInternal[lineIndex];

				const range = new VscodeApiRange(
					lineIndex,

					0,

					lineIndex,

					lineText.length,
				);

				const rangeIncludingLineBreak =
					lineIndex < self.#linesInternal.length - 1
						? new VscodeApiRange(lineIndex, 0, lineIndex + 1, 0)
						: range;

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
				/* ... (no change from original, uses #ensureLineStartsAvailable) ... */
				position = self._validatePositionApi(position);

				self.#ensureLineStartsAvailable();

				if (!self.#lineStartsInternal)
					throw new Error(
						"Line starts cache unavailable for offsetAt.",
					);

				if (position.line >= self.#lineStartsInternal.length) {
					let calculatedOffset =
						self.#lineStartsInternal[
							self.#lineStartsInternal.length - 1
						];

					for (
						let i = self.#lineStartsInternal.length - 1;
						i < position.line;
						i++
					) {
						calculatedOffset +=
							self.#linesInternal[i].length +
							self.#eolInternal.length;
					}

					calculatedOffset += position.character;

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
				/* ... (no change from original, uses #ensureLineStartsAvailable) ... */
				offset = Math.max(0, Math.floor(offset));

				self.#ensureLineStartsAvailable();

				if (!self.#lineStartsInternal)
					throw new Error(
						"Line starts cache unavailable for positionAt.",
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
					const lastLineIndex = Math.max(
						0,

						self.#linesInternal.length - 1,
					);

					return new VscodePosition(
						lastLineIndex,

						self.#linesInternal[lastLineIndex]?.length ?? 0,
					);
				}

				lineStartOffset = self.#lineStartsInternal[lineIndex];

				const character = Math.min(
					offset - lineStartOffset,

					self.#linesInternal[lineIndex]?.length ?? 0,
				);

				return new VscodePosition(lineIndex, character);
			},

			getText: (range?: VscodeApiRange): string => {
				/* ... (no change from original) ... */
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
			): VscodeApiRange | undefined => {
				/* ... (no change from original, uses ensureValidWordDefinition) ... */
				position = self._validatePositionApi(position);

				const lineText = self.#linesInternal[position.line];

				if (lineText === undefined) return undefined;

				const wordDefinition = ensureValidWordDefinition(
					regex || DEFAULT_WORD_REGEXP_IMPORTED,
				);

				if (getWordAtTextInternal) {
					try {
						const wordAt = getWordAtTextInternal(
							position.character + 1,

							wordDefinition,

							lineText,

							0,
						);

						if (wordAt)
							return new VscodeApiRange(
								position.line,

								wordAt.startColumn - 1,

								position.line,

								wordAt.endColumn - 1,
							);
					} catch (e: any) {
						self._logDocDataError(
							"Error using internal getWordAtText. Falling back.",

							e,
						);
					}
				}

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
						return new VscodeApiRange(
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
						break;
				}

				return undefined;
			},

			validateRange: (range: VscodeApiRange): VscodeApiRange =>
				self._validateRangeApi(range),

			validatePosition: (position: VscodePosition): VscodePosition =>
				self._validatePositionApi(position),
		};

		return Object.freeze(textDoc);
	}

	private _validatePositionApi(position: VscodePosition): VscodePosition {
		/* ... (no change from original) ... */
		if (!(position instanceof VscodePosition))
			throw new TypeError("Not a vscode.Position");

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

	private _validateRangeApi(range: VscodeApiRange): VscodeApiRange {
		/* ... (no change from original) ... */
		if (!(range instanceof VscodeApiRange))
			throw new TypeError("Not a vscode.Range");

		const start = this._validatePositionApi(range.start);

		const end = this._validatePositionApi(range.end);

		if (start === range.start && end === range.end) return range;

		return new VscodeApiRange(start, end);
	}

	get version(): number {
		return this.#versionIdInternal;
	}

	// Exposed on `document`
	// get languageId(): string { return this.#languageIdInternal; }

	get encoding(): string {
		return this.#encodingInternal;

		// Custom property
	}

	public dispose(): void {
		this._logDocDataDebug(
			`Disposing document data for URI='${this.#uriAdapter.toString()}'`,
		);
	}
}
