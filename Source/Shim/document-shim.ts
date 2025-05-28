/*---------------------------------------------------------------------------------------------
 * Cocoon Document Shim Service (document-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements `IExtHostDocumentsAndEditors` (focusing on `IExtHostDocuments`), managing
 * `TextDocument` data and lifecycle for extensions.
 *
 * - `CocoonDocumentService`: Manages `CocoonDocumentData` instances, provides
 *   `vscode.workspace.textDocuments` and document events. Handles RPC updates from Mountain.
 *   It is registered with DI and implements `VscodeExtHostDocumentsShape` for RPC calls from Mountain.
 * - `CocoonDocumentData`: Represents a document, provides the `vscode.TextDocument` API facade.
 *   Applies content changes, proxies `save()` to MainThread.
 *
 * Key Interactions:
 * - Registered with DI as `IExtHostDocuments` / `IExtHostDocumentsAndEditors`.
 * - Provides `vscode.workspace.textDocuments` and document events via `ShimExtHostWorkspace`.
 * - Synchronizes document state with Mountain's `MainThreadDocuments` via RPC.
 * - Uses `BaseCocoonShim` and (will use) `CocoonTypeConverters`.
 * - `wordHelper` utilities are imported assuming they are available from VS Code's 'out' directory.
 *
 * TODO:
 * - Centralize `localRangeDtoToApiRange` into `cocoon-type-converters.ts`.
 * - Thoroughly test edit application logic (`_applyInsertTextApi`, `_applyDeleteRangeApi`)
 *   with various edge cases.
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable, dispose, IDisposable } from "vs/base/common/lifecycle";
import { Schemas } from "vs/base/common/network";
import { splitLines } from "vs/base/common/strings";
import {
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
import type { IRange as VSCodeInternalIRange } from "vs/editor/common/core/range"; // DTO for edits
import {
	DEFAULT_WORD_REGEXP as DEFAULT_WORD_REGEXP_IMPORTED,
	ensureValidWordDefinition as ensureValidWordDefinitionImported,
	getWordAtText as getWordAtTextInternal,
} from "vs/editor/common/core/wordHelper.js";
// Assuming .js for runtime from out/
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
	Range as VscodeApiRange, // Renamed to avoid clash with VSCodeInternalRange
	Uri as VscodeApiUri,
	EndOfLine as VscodeEndOfLine,
	Position as VscodePosition,
	type TextDocument as VscodeTextDocument,
	type TextDocumentChangeEvent as VscodeTextDocumentChangeEvent,
	type TextDocumentContentChangeEvent as VscodeTextDocumentContentChangeEvent,
	type TextLine as VscodeTextLine,
} from "vscode";

// Assuming resolved to API shim

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- wordHelper Fallback ---
let ensureValidWordDefinition: (wordDefinition?: RegExp) => RegExp =
	ensureValidWordDefinitionImported;
if (typeof ensureValidWordDefinitionImported !== "function") {
	console.warn(
		"[Cocoon DocumentShim] `ensureValidWordDefinition` not imported from VS Code core, using fallback.",
	);
	const DEFAULT_WORD_REGEXP_FALLBACK =
		/(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;
	ensureValidWordDefinition = (wordDefinition?: RegExp): RegExp => {
		let result: RegExp = DEFAULT_WORD_REGEXP_FALLBACK;
		if (wordDefinition instanceof RegExp) {
			if (!wordDefinition.global) {
				let flags = "g";
				if (wordDefinition.ignoreCase) flags += "i";
				if (wordDefinition.multiline) flags += "m";
				if (wordDefinition.unicode) flags += "u"; // Keep unicode flag if present
				result = new RegExp(wordDefinition.source, flags);
			} else {
				result = wordDefinition;
			}
		}
		result.lastIndex = 0;
		return result;
	};
}

// TODO: Move this to a central cocoon-type-converters.ts
// `rangeDto` here is `VSCodeInternalIRange` from `IModelContentChange.range` in `extHost.protocol.ts`,
// which is 0-based for its coordinates representing model changes.
const localRangeDtoToApiRange = (
	rangeDto: VSCodeInternalIRange | undefined,
): VscodeApiRange => {
	if (!rangeDto) return new VscodeApiRange(0, 0, 0, 0); // Default for safety
	// DTO is 0-based, VscodeApiRange constructor is also 0-based.
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
	readonly #documents = new Map<string, CocoonDocumentData>(); // Key: VscodeApiUri.toString()

	readonly #onDidAddDocumentEmitter = this._instanceDisposables.add(
		new VscodeEmitter<VscodeTextDocument>(),
	);
	readonly #onDidRemoveDocumentEmitter = this._instanceDisposables.add(
		new VscodeEmitter<VscodeTextDocument>(),
	);
	readonly #onDidChangeDocumentEmitter = this._instanceDisposables.add(
		new VscodeEmitter<VscodeTextDocumentChangeEvent>(),
	);
	readonly #onDidSaveDocumentEmitter = this._instanceDisposables.add(
		new VscodeEmitter<VscodeTextDocument>(),
	);

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
				"MainThreadDocuments RPC proxy NOT obtained. Document operations like save, open (from workspace) will fail.",
			);
		}
	}

	public getMainThreadDocumentsProxy(): MainThreadDocumentsProxyService | null {
		return this.#mainThreadDocumentsProxy;
	}

	/** Internal helper to marshal a VscodeApiUri to UriComponents DTO for RPC. */
	protected _marshalApiUriToDto(
		uri: VscodeApiUri,
	): VSCodeInternalUriComponents | undefined {
		const dto = this._convertApiArgToInternal(uri); // BaseCocoonShim handles conversion
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

	// --- RPC Methods from MainThread (VscodeExtHostDocumentsShape) ---
	public $acceptModelAdded(
		uriComponents: VSCodeInternalUriComponents,
		eol: string,
		versionId: number,
		lines: string[],
		languageId: string,
		isDirty: boolean,
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
			this,
			revivedVscodeApiUri,
			lines,
			eol,
			languageId,
			versionId,
			isDirty,
			"utf8", // Default encoding, TODO: use _encoding_unused or get from MainThread DTO
			this._logService,
			(uri: VscodeApiUri) => this._marshalApiUriToDto(uri), // Pass marshaller
			(dto: VSCodeInternalUriComponents) =>
				this._reviveUriDtoToVscodeApiUri(dto), // Pass reviver
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
			dispose(documentData); // Dispose the CocoonDocumentData instance
		} else {
			this._logWarn(
				`$acceptModelRemoved: Document '${uriString}' not found.`,
			);
		}
	}

	public $acceptModelChanged(
		uriComponents: VSCodeInternalUriComponents,
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
				eventData.versionId !== -1 /* -1 might be forced update */
			) {
				this._logWarn(
					`$acceptModelChanged: Stale event (V${eventData.versionId}) for URI '${uriString}' (current V${documentData.version}). Content changes ignored. Applying dirty state.`,
				);
				documentData._acceptIsDirtyInternal(isDirty); // Still update dirty state
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
				const vscodeContentChanges: VscodeTextDocumentContentChangeEvent[] =
					contentChanged
						? eventData.changes.map((change) => ({
								range: localRangeDtoToApiRange(change.range), // Uses local DTO->API converter
								rangeOffset: change.rangeOffset,
								rangeLength: change.rangeLength,
								text: change.text,
							}))
						: [];
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
			documentData._acceptIsDirtyInternal(false); // Saved implies not dirty
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
			// _reviveApiArgument from BaseCocoonShim should handle DTO -> VscodeApiUri conversion
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
		super.dispose(); // BaseCocoonShim handles _instanceDisposables (which now includes emitters)
		dispose([...this.#documents.values()]); // Dispose individual CocoonDocumentData instances
		this.#documents.clear();
		this._logInfo("Disposed and cleared all document data.");
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
	readonly #documentService: CocoonDocumentService; // For save and URI marshalling access
	readonly #uriMarshaller: (
		uri: VscodeApiUri,
	) => VSCodeInternalUriComponents | undefined;
	readonly #uriReviverForRelatedInfo: (
		dto: VSCodeInternalUriComponents,
	) => VscodeApiUri | undefined; // For relatedInformation in diagnostics
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
		) => VSCodeInternalUriComponents | undefined,
		uriReviverForRelatedInfo: (
			dto: VSCodeInternalUriComponents,
		) => VscodeApiUri | undefined,
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
		this.#uriReviverForRelatedInfo = uriReviverForRelatedInfo; // Store the reviver
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
		const prefix = `[CocoonDocData][${this.#uriAdapter.fsPath || this.#uriAdapter.toString()}]`;
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
	private _logDocDataWarn(message: string, ...args: any[]): void {
		this.#logService?.warn(
			`[CocoonDocData][${this.#uriAdapter.fsPath || this.#uriAdapter.toString()}] ${message}`,
			...args,
		);
	}

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
			return eolChanged; // Only return true if EOL changed, content change was skipped
		}
		this.#lineStartsInternal = null; // Invalidate line starts cache due to content change
		let currentLinesSnapshot = [...this.#linesInternal];
		for (const change of changes) {
			const vscodeRange = localRangeDtoToApiRange(change.range); // Uses 0-based DTO to 0-based API Range
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
		return true; // Content changed (or EOL changed and content was processed)
	}

	private _applyDeleteRangeApi(
		lines: string[],
		range: VscodeApiRange,
	): string[] {
		if (range.isEmpty) return lines;
		const currentDocLines = [...lines]; // Operate on a copy
		const { start, end } = range;
		if (start.line === end.line) {
			// Single line deletion
			const lineText = currentDocLines[start.line];
			currentDocLines[start.line] =
				lineText.substring(0, start.character) +
				lineText.substring(end.character);
		} else {
			// Multi-line deletion
			const firstLineText = currentDocLines[start.line];
			const lastLineText = currentDocLines[end.line];
			currentDocLines[start.line] =
				firstLineText.substring(0, start.character) +
				lastLineText.substring(end.character);
			currentDocLines.splice(start.line + 1, end.line - start.line); // Remove intermediate lines
		}
		return currentDocLines;
	}

	private _applyInsertTextApi(
		lines: string[],
		position: VscodePosition,
		text: string,
	): string[] {
		if (!text) return lines;
		const currentDocLines = [...lines]; // Operate on a copy
		const { line, character } = position;
		const normalizedTextToInsert = text.replace(
			/\r\n|\n|\r/g,
			this.#eolInternal,
		); // Normalize EOLs in inserted text
		const insertTextLines = splitLines(normalizedTextToInsert); // Use helper for robust splitting
		if (insertTextLines.length === 1) {
			// Single line insert
			const lineText = currentDocLines[line];
			currentDocLines[line] =
				lineText.substring(0, character) +
				insertTextLines[0] +
				lineText.substring(character);
		} else {
			// Multi-line insert
			const lineText = currentDocLines[line];
			const textAfterInsertPointOnOriginalLine =
				lineText.substring(character);
			currentDocLines[line] =
				lineText.substring(0, character) + insertTextLines[0]; // First part of insert
			const subsequentLinesToInsert = insertTextLines.slice(1);
			subsequentLinesToInsert[subsequentLinesToInsert.length - 1] +=
				textAfterInsertPointOnOriginalLine; // Append rest of original line to last inserted line
			currentDocLines.splice(line + 1, 0, ...subsequentLinesToInsert); // Insert new lines
		}
		return currentDocLines;
	}

	#ensureLineStartsAvailable(): void {
		if (this.#lineStartsInternal === null) {
			const eolCharacterLength = this.#eolInternal.length;
			let currentOffset = 0;
			const r: number[] = [0]; // First line starts at offset 0
			for (let i = 0; i < this.#linesInternal.length - 1; i++) {
				// Iterate up to second to last line
				currentOffset +=
					this.#linesInternal[i].length + eolCharacterLength;
				r.push(currentOffset);
			}
			this.#lineStartsInternal = r;
		}
	}

	private _createTextDocumentApiObject(): VscodeTextDocument {
		const self = this; // For closures
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
			}, // Custom property for Cocoon
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
					const uriDto = self.#uriMarshaller(self.#uriAdapter); // Use injected marshaller
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
				position = self._validatePositionApi(position);
				self.#ensureLineStartsAvailable();
				if (!self.#lineStartsInternal)
					throw new Error(
						"Line starts cache unavailable for offsetAt.",
					);
				if (position.line >= self.#lineStartsInternal.length) {
					// Position is on or after the last line
					let calculatedOffset =
						self.#lineStartsInternal[
							self.#lineStartsInternal.length - 1
						]; // Start of last line
					// Add length of last line
					calculatedOffset +=
						self.#linesInternal[self.#linesInternal.length - 1]
							?.length ?? 0;
					// If position.line is > last line index, effectively it's at the end of doc
					// Add characters on the (potentially non-existent) line
					if (position.line > self.#linesInternal.length - 1) {
						calculatedOffset +=
							(position.line - (self.#linesInternal.length - 1)) *
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
					// Offset is beyond the document content
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
				position = self._validatePositionApi(position);
				const lineText = self.#linesInternal[position.line];
				if (lineText === undefined) return undefined; // Should not happen if position is validated
				const wordDefinition = ensureValidWordDefinition(
					regex || DEFAULT_WORD_REGEXP_IMPORTED,
				);
				if (typeof getWordAtTextInternal === "function") {
					// Check if imported function is available
					try {
						const wordAt = getWordAtTextInternal(
							position.character + 1,
							wordDefinition,
							lineText,
							0,
						); // 1-based column for wordHelper
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
				// Fallback logic
				wordDefinition.lastIndex = 0; // Reset regex state
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
						break; // Avoid infinite loop on empty match
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
			character = this.#linesInternal[line]?.length ?? 0; // Length of last line
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
	get encoding(): string {
		return this.#encodingInternal;
	} // Custom property

	public dispose(): void {
		this._logDocDataDebug(
			`Disposing document data for URI='${this.#uriAdapter.toString()}'`,
		);
		// No complex resources owned by CocoonDocumentData directly, mostly state.
		// Event listeners for TextDocument are on CocoonDocumentService's emitters.
	}
}
