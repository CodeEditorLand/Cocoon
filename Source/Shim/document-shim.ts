/*---------------------------------------------------------------------------------------------
 * Cocoon Document Shim Service (shims/document-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtHostDocuments` service and manages `ShimDocumentData` instances,
 *
 *
 * which represent open text documents within the Cocoon extension host environment.
 * It synchronizes document state (content, language, dirty status) with Mountain.
 *
 * Responsibilities:
 *
 * - `ShimDocumentService`:
 *
 *   - Manages a map (`#documents`) of URI strings to `ShimDocumentData` instances.
 *   - Provides central access to document data (`getDocument`, `allDocuments`, `getTextDocuments`).
 *   - Exposes the standard document lifecycle events (`onDidAddDocument`, `onDidRemoveDocument`,
 *
 *
 *     `onDidChangeDocument`, `onDidSaveDocument`) by firing VS Code Emitters.
 *   - Implements RPC methods called *by* Mountain (`$acceptModelAdded`, `$acceptModelRemoved`,
 *
 *
 *     `$acceptModelChanged`, `$acceptModelSaved`, `$acceptDirtyStateChanged`, etc.) to receive
 *     updates about document state changes initiated on the main thread or filesystem.
 *   - Registers itself with the `RPCProtocol` to receive these incoming calls.
 * - `ShimDocumentData`:
 *
 *   - Represents a single document's state (URI, lines, version, language, dirty status).
 *   - Provides the `vscode.TextDocument` API facade to extensions, including a full `vscode.TextLine` implementation.
 *   - Implements methods like `getText`, `lineAt`, `offsetAt`, `positionAt`, `getWordRangeAtPosition`, `save` (proxies to Mountain).
 *   - Contains logic (`_acceptContentChanges`) to apply textual changes received from Mountain,
 *
 *
 *     updating the internal line buffer and version ID.
 *   - Manages line start offsets for efficient position calculations.
 *
 * Key Interactions:
 *
 * - Provides `vscode.workspace.textDocuments` (via `ShimDocumentService.getTextDocuments`).
 * - Provides `vscode.workspace.onDid*TextDocument` events.
 * - `ShimDocumentService` receives state updates from Mountain via `RPCProtocol` (`$accept...` calls).
 * - `ShimDocumentData.save` calls `$trySaveDocument` on `MainThreadDocuments` via RPC.
 * - Relies on VS Code classes (`URI`, `Position`, `Range`, `Event`, `Emitter`, potentially `MirrorTextModel` helpers, `wordHelper`)
 *   which need to be available from the JS bundle.
 *--------------------------------------------------------------------------------------------*/

// Renamed to VscodeEvent
import { Emitter, type Event as VscodeEvent } from "vs/base/common/event";
import { splitLines } from "vs/base/common/strings";
import {
	ExtHostContext,
	type IModelContentChange,
	ISingleEditOperation,
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";
// Needs bundling and correct interface definitions
import {
	EndOfLine,
	Location,
	Position,
	Range,
	type TextDocument,
	type TextDocumentChangeEvent,
	type TextDocumentContentChangeEvent,
	type TextLine,
	Uri,
} from "vscode";

// Assuming these are from the 'vscode' API shims or real API if bundled

import {
	BaseCocoonShim,
	type IExtHostRpcService,
	type ILogService,
	type ProxyIdentifier,
} from "./_baseShim";

// Attempt to import VS Code's word helper utility and regex validator
let getWordAtTextInternal:
	| ((
			text: string,

			R: RegExp,

			column: number,

			textBefore?: number,
	  ) => { word: string; startColumn: number; endColumn: number } | null)
	| null = null;

let ensureValidWordDefinitionInternal:
	| ((wordDefinition?: RegExp) => RegExp)
	| null = null;

try {
	const wordHelper = require("vs/editor/common/core/wordHelper");

	getWordAtTextInternal = wordHelper.getWordAtText;

	ensureValidWordDefinitionInternal = wordHelper.ensureValidWordDefinition;

	console.log("[DocumentShim] Loaded vs/editor/common/core/wordHelper");
} catch (e) {
	console.warn(
		"[DocumentShim] vs/editor/common/core/wordHelper not found, using basic regex for getWordRangeAtPosition.",
	);

	const DEFAULT_WORD_REGEXP_SOURCE =
		"(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\#\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\|\\;\\:\\'\"\\,\\.\\<\\>\\/\\?\\s]+)";

	const DEFAULT_WORD_REGEXP = new RegExp(DEFAULT_WORD_REGEXP_SOURCE, "g");

	ensureValidWordDefinitionInternal = (wordDefinition?: RegExp): RegExp => {
		let result = DEFAULT_WORD_REGEXP;

		if (wordDefinition && wordDefinition instanceof RegExp) {
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

const DEFAULT_WORD_REGEXP_FALLBACK =
	/(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;

// --- Interfaces for RPC and internal data structures ---
interface MainThreadDocumentsShape {
	$trySaveDocument(uri: any /* UriComponents */): Promise<boolean>;

	// Add other methods if MainThreadDocuments has them
}

interface ExtHostDocumentsShape {
	$acceptModelAdded(
		uriComponents: any,

		lines: string[],

		eol: string,

		versionId: number,

		languageId: string,

		isDirty: boolean,

		encoding: string,
	): void;

	$acceptModelRemoved(uriComponents: any): void;

	$acceptModelChanged(
		uriComponents: any,

		events: {
			versionId: number;

			changes: IModelContentChange[] /* from protocol */;
		},

		isDirty: boolean,
	): void;

	$acceptModelSaved(uriComponents: any): void;

	$acceptDirtyStateChanged(uriComponents: any, isDirty: boolean): void;

	$acceptModelLanguageChanged(
		uriComponents: any,

		newLanguageId: string,
	): void;

	$acceptEncodingChanged(uriComponents: any, newEncoding: string): void;
}

// Forward declaration for ShimDocumentService to resolve circular dependency for _textDocumentApiService
class ShimDocumentService
	extends BaseCocoonShim
	implements ExtHostDocumentsShape
{
	public readonly _serviceBrand: undefined;

	#mainThreadDocsProxy: MainThreadDocumentsShape | null = null;

	// Key: uri.toString()
	#documents = new Map<string, ShimDocumentData>();

	#onDidAddDocumentEmitter = new Emitter<TextDocument>();

	#onDidRemoveDocumentEmitter = new Emitter<TextDocument>();

	#onDidChangeDocumentEmitter = new Emitter<TextDocumentChangeEvent>();

	#onDidSaveDocumentEmitter = new Emitter<TextDocument>();

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtHostDocuments", rpcService, logService);

		if (this._rpcService) {
			this.#mainThreadDocsProxy = this._getProxy(
				MainContext.MainThreadDocuments as ProxyIdentifier<MainThreadDocumentsShape>,
			);
		}

		if (!this.#mainThreadDocsProxy) {
			this._logError(
				"Failed to get MainThreadDocuments proxy! Document sync may fail.",
			);
		}

		if (this._rpcService) {
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostDocuments as ProxyIdentifier<ExtHostDocumentsShape>,

					this,
				);

				this._log(
					"Registered self for incoming RPC calls (ExtHostDocuments).",
				);
			} catch (e: any) {
				this._logError("Failed to set ExtHostDocuments for RPC:", e);
			}
		} else {
			this._logError(
				"RPCService is not available, cannot set ExtHostDocuments for RPC.",
			);
		}
	}

	public getMainThreadProxy(): MainThreadDocumentsShape | null {
		return this.#mainThreadDocsProxy;
	}

	public get allDocuments(): ShimDocumentData[] {
		return [...this.#documents.values()];
	}

	public getDocument(uri: Uri): ShimDocumentData | undefined {
		if (!Uri.isUri(uri)) {
			// Use Uri.isUri for type guard
			this._logWarn(`getDocument called with non-URI:`, uri);

			return undefined;
		}

		return this.#documents.get(uri.toString());
	}

	public getTextDocuments(): TextDocument[] {
		return this.allDocuments.map((d) => d.document);
	}

	public get onDidAddDocument(): VscodeEvent<TextDocument> {
		return this.#onDidAddDocumentEmitter.event;
	}

	public get onDidRemoveDocument(): VscodeEvent<TextDocument> {
		return this.#onDidRemoveDocumentEmitter.event;
	}

	public get onDidChangeDocument(): VscodeEvent<TextDocumentChangeEvent> {
		return this.#onDidChangeDocumentEmitter.event;
	}

	public get onDidSaveDocument(): VscodeEvent<TextDocument> {
		return this.#onDidSaveDocumentEmitter.event;
	}

	// _reviveUri and _convertApiArgToInternal are inherited from BaseCocoonShim.
	// If more specific URI revival is needed here, it can be overridden.
	protected _reviveUri(uriComponents: any): Uri | undefined {
		if (!uriComponents) return undefined;

		// Use base class reviver
		const revived = super._reviveApiArgument<Uri>(uriComponents);

		if (revived instanceof Uri) return revived;

		// Fallback to manual Uri.from if base reviver doesn't work or if $mid is not present
		try {
			// Uri.from can often handle {scheme, path, ...}

			return Uri.from(uriComponents);
		} catch (e: any) {
			this._logError(
				"Failed to revive URI from components (fallback):",

				uriComponents,

				e,
			);

			return undefined;
		}
	}

	public $acceptModelAdded(
		uriComponents: any,

		lines: string[],

		eol: string,

		versionId: number,

		languageId: string,

		isDirty: boolean,

		encoding: string,
	): void {
		const uri = this._reviveUri(uriComponents);

		if (!uri) {
			this._logError(
				"$acceptModelAdded: Failed to revive URI",

				uriComponents,
			);

			return;
		}

		const uriStr = uri.toString();

		if (this.#documents.has(uriStr)) {
			this._logWarn(
				`$acceptModelAdded: Document already exists ${uriStr}`,
			);

			return;
		}

		this._log(
			`$acceptModelAdded: ${uriStr} V${versionId} Lang=${languageId}`,
		);

		const data = new ShimDocumentData(
			uri,

			lines,

			eol,

			languageId,

			versionId,

			isDirty,

			encoding,

			this._logService,

			this,
		);

		this.#documents.set(uriStr, data);

		this.#onDidAddDocumentEmitter.fire(data.document);
	}

	public $acceptModelRemoved(uriComponents: any): void {
		const uri = this._reviveUri(uriComponents);

		if (!uri) {
			this._logError(
				"$acceptModelRemoved: Failed to revive URI",

				uriComponents,
			);

			return;
		}

		const uriStr = uri.toString();

		const data = this.#documents.get(uriStr);

		if (data) {
			this._log(`$acceptModelRemoved: ${uriStr}`);

			data._markClosed();

			this.#documents.delete(uriStr);

			this.#onDidRemoveDocumentEmitter.fire(data.document);
		} else {
			this._logWarn(`$acceptModelRemoved: Document not found ${uriStr}`);
		}
	}

	public $acceptModelChanged(
		uriComponents: any,

		events: { versionId: number; changes: IModelContentChange[] },

		isDirty: boolean,
	): void {
		const uri = this._reviveUri(uriComponents);

		if (!uri) {
			this._logError(
				"$acceptModelChanged: Failed to revive URI",

				uriComponents,
			);

			return;
		}

		const uriStr = uri.toString();

		const data = this.#documents.get(uriStr);

		if (data) {
			if (data.document.version >= events.versionId) {
				this._logWarn(
					`$acceptModelChanged: Stale event version ${events.versionId} received for ${uriStr} (current: ${data.document.version}). Skipping.`,
				);

				// Still update dirty state
				data._acceptIsDirty(isDirty);

				return;
			}

			this._log(
				`$acceptModelChanged: ${uriStr} V${events.versionId}, ${events.changes.length} changes, dirty=${isDirty}`,
			);

			const contentChanged = data._acceptContentChanges(
				events.versionId,

				events.changes,
			);

			const dirtinessChanged = data._acceptIsDirty(isDirty);

			if (!contentChanged && !dirtinessChanged) {
				this._log(
					`$acceptModelChanged: No effective change for ${uriStr} V${events.versionId}.`,
				);

				return;
			}

			const contentChanges: TextDocumentContentChangeEvent[] =
				events.changes.map((change) => {
					const range = new Range(
						change.range.startLineNumber - 1,

						change.range.startColumn - 1,

						change.range.endLineNumber - 1,

						change.range.endColumn - 1,
					);

					return Object.freeze({
						range: range,

						rangeOffset: change.rangeOffset ?? 0,

						rangeLength: change.rangeLength ?? 0,

						text: change.text,
					});
				});

			this.#onDidChangeDocumentEmitter.fire(
				Object.freeze({
					document: data.document,

					contentChanges: Object.freeze(
						contentChanges,

						// Ensure readonly
					) as readonly TextDocumentContentChangeEvent[],

					// Add reason if protocol supports it
					reason: undefined,
				}),
			);
		} else {
			this._logWarn(`$acceptModelChanged: Document not found ${uriStr}`);
		}
	}

	public $acceptModelSaved(uriComponents: any): void {
		const uri = this._reviveUri(uriComponents);

		if (!uri) {
			this._logError(
				"$acceptModelSaved: Failed to revive URI",

				uriComponents,
			);

			return;
		}

		const uriStr = uri.toString();

		const data = this.#documents.get(uriStr);

		if (data) {
			this._log(`$acceptModelSaved: ${uriStr}`);

			const dirtinessChanged = data._acceptIsDirty(false);

			if (dirtinessChanged) {
				this.#onDidChangeDocumentEmitter.fire(
					Object.freeze({
						document: data.document,

						contentChanges: Object.freeze(
							[],
						) as readonly TextDocumentContentChangeEvent[],

						reason: undefined,
					}),
				);
			}

			this.#onDidSaveDocumentEmitter.fire(data.document);
		} else {
			this._logWarn(`$acceptModelSaved: Document not found ${uriStr}`);
		}
	}

	public $acceptDirtyStateChanged(
		uriComponents: any,

		isDirty: boolean,
	): void {
		const uri = this._reviveUri(uriComponents);

		if (!uri) {
			this._logError(
				"$acceptDirtyStateChanged: Failed to revive URI",

				uriComponents,
			);

			return;
		}

		const uriStr = uri.toString();

		const data = this.#documents.get(uriStr);

		if (data) {
			this._log(`$acceptDirtyStateChanged: ${uriStr} -> ${isDirty}`);

			const dirtinessChanged = data._acceptIsDirty(isDirty);

			if (dirtinessChanged) {
				this.#onDidChangeDocumentEmitter.fire(
					Object.freeze({
						document: data.document,

						contentChanges: Object.freeze(
							[],
						) as readonly TextDocumentContentChangeEvent[],

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
		uriComponents: any,

		newLanguageId: string,
	): void {
		const uri = this._reviveUri(uriComponents);

		if (!uri) {
			this._logError(
				"$acceptModelLanguageChanged: Failed to revive URI",

				uriComponents,
			);

			return;
		}

		const uriStr = uri.toString();

		const data = this.#documents.get(uriStr);

		if (data) {
			this._log(
				`$acceptModelLanguageChanged: ${uriStr} -> ${newLanguageId}`,
			);

			const changed = data._acceptLanguageId(newLanguageId);

			if (changed) {
				this.#onDidChangeDocumentEmitter.fire(
					Object.freeze({
						document: data.document,

						contentChanges: Object.freeze(
							[],
						) as readonly TextDocumentContentChangeEvent[],

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

	public $acceptEncodingChanged(uriComponents: any, encoding: string): void {
		const uri = this._reviveUri(uriComponents);

		if (!uri) {
			this._logError(
				"$acceptEncodingChanged: Failed to revive URI",

				uriComponents,
			);

			return;
		}

		const uriStr = uri.toString();

		const data = this.#documents.get(uriStr);

		if (data) {
			this._log(`$acceptEncodingChanged: ${uriStr} -> ${encoding}`);

			const changed = data._acceptEncoding(encoding);

			if (changed) {
				this.#onDidChangeDocumentEmitter.fire(
					Object.freeze({
						document: data.document,

						contentChanges: Object.freeze(
							[],
						) as readonly TextDocumentContentChangeEvent[],

						reason: undefined,
					}),
				);
			}
		} else {
			this._logWarn(
				`$acceptEncodingChanged: Document not found ${uriStr}`,
			);
		}
	}
}

export class ShimDocumentData {
	readonly #uri: Uri;

	#lines: string[] = [];

	#eol = "\n";

	#versionId = 1;

	#languageId = "plaintext";

	#isDirty = false;

	#isClosed = false;

	// Added encoding
	#encoding = "utf8";

	#logService?: ILogService;

	// Reference to the service
	#textDocumentApiService: ShimDocumentService;

	// Cache for line starts (offsets)
	#lineStarts: number[] | null = null;

	// The actual vscode.TextDocument object facade, typed with the vscode.TextDocument interface
	public readonly document: TextDocument;

	constructor(
		uri: Uri,

		lines: string[],

		eol: string,

		languageId: string,

		versionId: number,

		isDirty: boolean,

		encoding: string,

		logService: ILogService | undefined,

		textDocumentApiService: ShimDocumentService,
	) {
		this.#uri = uri;

		this.#lines = lines;

		this.#eol = eol;

		this.#languageId = languageId;

		this.#versionId = versionId;

		this.#isDirty = isDirty;

		this.#encoding = encoding;

		this.#logService = logService;

		this.#textDocumentApiService = textDocumentApiService;

		this.document = this._createTextDocumentApiObject();

		this._log(
			`Created ShimDocumentData V${this.#versionId} for ${this.#uri.toString()}`,
		);
	}

	// Logger methods
	private _log(msg: string, ...args: any[]): void {
		this.#logService?.trace(
			`[DocumentShimData][${this.#uri?.fsPath || this.#uri?.toString() || "unknown"}] ${msg}`,

			...args,
		);
	}

	private _logError(msg: string, ...args: any[]): void {
		this.#logService?.error(
			`[DocumentShimData][${this.#uri?.fsPath || this.#uri?.toString() || "unknown"}] ${msg}`,

			...args,
		);
	}

	private _logWarn(msg: string, ...args: any[]): void {
		this.#logService?.warn(
			`[DocumentShimData][${this.#uri?.fsPath || this.#uri?.toString() || "unknown"}] ${msg}`,

			...args,
		);
	}

	// --- State Update Methods ---
	public _acceptLanguageId(newLanguageId: string): boolean {
		if (this.#languageId !== newLanguageId) {
			this.#languageId = newLanguageId;

			return true;
		}

		return false;
	}

	public _acceptIsDirty(newIsDirty: boolean): boolean {
		if (this.#isDirty !== newIsDirty) {
			this.#isDirty = newIsDirty;

			return true;
		}

		return false;
	}

	public _acceptEncoding(newEncoding: string): boolean {
		if (this.#encoding !== newEncoding) {
			this.#encoding = newEncoding;

			return true;
		}

		return false;
	}

	public _markClosed(): void {
		this.#isClosed = true;
	}

	public _acceptContentChanges(
		versionId: number,

		changes: IModelContentChange[],
	): boolean {
		if (this.#versionId >= versionId) {
			this._log(
				`Skipping changes for older/same version ${versionId} (current: ${this.#versionId})`,
			);

			return false;
		}

		this._log(
			`Applying ${changes.length} changes, new version ${versionId}`,
		);

		// Invalidate cache
		this.#lineStarts = null;

		let currentLines = [...this.#lines];

		for (const change of changes) {
			const range = new Range(
				change.range.startLineNumber - 1,

				change.range.startColumn - 1,

				change.range.endLineNumber - 1,

				change.range.endColumn - 1,
			);

			const afterDelete = this._applyDeleteRangeInternal(
				currentLines,

				range,
			);

			currentLines = this._applyInsertTextInternal(
				afterDelete,

				range.start,

				change.text,
			);
		}

		this.#lines = currentLines;

		this.#versionId = versionId;

		return true;
	}

	private _applyDeleteRangeInternal(lines: string[], range: Range): string[] {
		if (range.isEmpty) return lines;

		// Work on copy
		const currentLines = [...lines];

		const { start, end } = range;

		if (
			start.line < 0 ||
			start.line >= currentLines.length ||
			end.line < 0 ||
			end.line >= currentLines.length
		) {
			this._logError(
				`Invalid range indices for delete: ${start.line}-${end.line} (Lines: ${currentLines.length})`,
			);

			return lines;
		}

		if (start.line === end.line) {
			const line = currentLines[start.line];

			const safeStart = Math.min(start.character, line.length);

			const safeEnd = Math.min(end.character, line.length);

			if (safeStart > safeEnd) {
				this._logError(
					`Invalid character range for delete: ${start.character}-${end.character} (Line Length: ${line.length})`,
				);

				return lines;
			}

			currentLines[start.line] =
				line.substring(0, safeStart) + line.substring(safeEnd);
		} else {
			const firstLine = currentLines[start.line];

			const lastLine = currentLines[end.line];

			const safeStartChar = Math.min(start.character, firstLine.length);

			const safeEndChar = Math.min(end.character, lastLine.length);

			currentLines[start.line] =
				firstLine.substring(0, safeStartChar) +
				lastLine.substring(safeEndChar);

			currentLines.splice(start.line + 1, end.line - start.line);
		}

		return currentLines;
	}

	private _applyInsertTextInternal(
		lines: string[],

		position: Position,

		text: string,
	): string[] {
		if (text === undefined || text === null || text.length === 0)
			return lines;

		// Work on copy
		const currentLines = [...lines];

		const { line, character } = position;

		if (line < 0 || line >= currentLines.length) {
			this._logError(
				`Invalid line index for insert: ${line} (Lines: ${currentLines.length})`,
			);

			return lines;
		}

		const normalizedText = text.replace(/\r\n|\n|\r/g, this.#eol);

		const insertLines = splitLines(normalizedText);

		if (insertLines.length === 1) {
			const currentLineText = currentLines[line];

			const safeCharIndex = Math.min(character, currentLineText.length);

			if (safeCharIndex < 0) {
				this._logError(
					`Invalid character index for insert: ${character} (Line Length: ${currentLineText.length})`,
				);

				return lines;
			}

			currentLines[line] =
				currentLineText.substring(0, safeCharIndex) +
				insertLines[0] +
				currentLineText.substring(safeCharIndex);
		} else {
			const currentLineText = currentLines[line];

			const safeCharIndex = Math.min(character, currentLineText.length);

			if (safeCharIndex < 0) {
				this._logError(
					`Invalid character index for insert: ${character} (Line Length: ${currentLineText.length})`,
				);

				return lines;
			}

			const overflowingText = currentLineText.substring(safeCharIndex);

			currentLines[line] =
				currentLineText.substring(0, safeCharIndex) + insertLines[0];

			const linesToInsert = insertLines.slice(1);

			linesToInsert[linesToInsert.length - 1] += overflowingText;

			currentLines.splice(line + 1, 0, ...linesToInsert);
		}

		return currentLines;
	}

	#ensureLineStarts(): void {
		if (this.#lineStarts === null) {
			const eolLength = this.#eol.length;

			let currentOffset = 0;

			// Start offset of first line is always 0
			const R = [0];

			for (let i = 0; i < this.#lines.length; i++) {
				currentOffset += this.#lines[i].length + eolLength;

				R.push(currentOffset);
			}

			this.#lineStarts = R;
		}
	}

	private _offsetAt(position: Position): number {
		position = this._validatePosition(position);

		this.#ensureLineStarts();

		// Should not happen
		if (!this.#lineStarts) throw new Error("Line starts not initialized");

		if (position.line >= this.#lines.length) {
			return this.#lineStarts[this.#lines.length];
		}

		return this.#lineStarts[position.line] + position.character;
	}

	private _positionAt(offset: number): Position {
		offset = Math.max(0, Math.floor(offset));

		this.#ensureLineStarts();

		if (!this.#lineStarts) throw new Error("Line starts not initialized");

		let low = 0,
			high = this.#lines.length;

		let mid = 0,
			lineStartOffset = 0;

		while (low < high) {
			mid = low + Math.floor((high - low) / 2);

			lineStartOffset = this.#lineStarts[mid];

			if (offset >= lineStartOffset) {
				low = mid + 1;
			} else {
				high = mid;
			}
		}

		const lineIndex = Math.max(0, low - 1);

		lineStartOffset = this.#lineStarts[lineIndex];

		let character = offset - lineStartOffset;

		const lineLength = this.#lines[lineIndex]?.length ?? 0;

		character = Math.min(character, lineLength);

		return new Position(lineIndex, character);
	}

	private _getTextInRange(range: Range): string {
		range = this._validateRange(range);

		if (range.isEmpty) return "";

		const { start, end } = range;

		if (
			start.line < 0 ||
			start.line >= this.#lines.length ||
			end.line < 0 ||
			end.line >= this.#lines.length
		) {
			this._logError(
				`Invalid range indices for getTextInRange: ${start.line}-${end.line} (Lines: ${this.#lines.length})`,
			);

			return "";
		}

		if (start.line === end.line) {
			return this.#lines[start.line].substring(
				start.character,

				end.character,
			);
		} else {
			const result: string[] = [];

			result.push(this.#lines[start.line].substring(start.character));

			for (let i = start.line + 1; i < end.line; i++) {
				result.push(this.#lines[i]);
			}

			result.push(this.#lines[end.line].substring(0, end.character));

			return result.join(this.#eol);
		}
	}

	private _validatePosition(position: Position): Position {
		if (!(position instanceof Position)) {
			throw new Error(
				`Invalid argument: position must be an instance of vscode.Position. Received: ${position}`,
			);
		}

		let { line, character } = position;

		let hasChanged = false;

		if (line < 0) {
			line = 0;

			character = 0;

			hasChanged = true;
		} else if (line >= this.#lines.length) {
			line = Math.max(0, this.#lines.length - 1);

			character = this.#lines[line]?.length ?? 0;

			hasChanged = true;
		} else {
			const maxCharacter = this.#lines[line].length;

			if (character < 0) {
				character = 0;

				hasChanged = true;
			} else if (character > maxCharacter) {
				character = maxCharacter;

				hasChanged = true;
			}
		}

		return hasChanged ? new Position(line, character) : position;
	}

	private _validateRange(range: Range): Range {
		if (!(range instanceof Range)) {
			throw new Error(
				`Invalid argument: range must be an instance of vscode.Range. Received: ${range}`,
			);
		}

		const start = this._validatePosition(range.start);

		const end = this._validatePosition(range.end);

		if (
			start.line > end.line ||
			(start.line === end.line && start.character > end.character)
		) {
			// Swapped
			return new Range(end, start);
		}

		return start === range.start && end === range.end
			? range
			: new Range(start, end);
	}

	private _getWordRangeAtPosition(
		position: Position,

		regexp?: RegExp,
	): Range | undefined {
		position = this._validatePosition(position);

		const lineContent = this.#lines[position.line];

		if (lineContent === undefined || lineContent === null) {
			this._logWarn(
				`_getWordRangeAtPosition called for invalid line index: ${position.line}`,
			);

			return undefined;
		}

		const wordDefinition =
			regexp ||
			(ensureValidWordDefinitionInternal
				? ensureValidWordDefinitionInternal(undefined)
				: DEFAULT_WORD_REGEXP_FALLBACK);

		if (getWordAtTextInternal && ensureValidWordDefinitionInternal) {
			try {
				const wordAt = getWordAtTextInternal(
					// text
					lineContent,

					// word definition
					ensureValidWordDefinitionInternal(wordDefinition),

					// 1-based column
					position.character + 1,

					// search from beginning of line
					0,
				);

				if (wordAt) {
					return new Range(
						position.line,

						wordAt.startColumn - 1,

						position.line,

						wordAt.endColumn - 1,
					);
				}
			} catch (e: any) {
				this._logError("Error using getWordAtText:", e);

				return this._getWordRangeAtPositionFallback(
					position,

					wordDefinition,
				);
			}
		} else {
			return this._getWordRangeAtPositionFallback(
				position,

				wordDefinition,
			);
		}

		return undefined;
	}

	private _getWordRangeAtPositionFallback(
		position: Position,

		regexp: RegExp,
	): Range | undefined {
		const lineText = this.#lines[position.line];

		let localRegexp = regexp;

		if (!localRegexp.global) {
			let flags = "g";

			if (localRegexp.ignoreCase) flags += "i";

			if (localRegexp.multiline) flags += "m";

			if (localRegexp.unicode) flags += "u";

			localRegexp = new RegExp(localRegexp.source, flags);
		}

		localRegexp.lastIndex = 0;

		let match;

		while ((match = localRegexp.exec(lineText))) {
			const matchStartIndex = match.index;

			const matchEndIndex = matchStartIndex + match[0].length;

			if (
				matchStartIndex <= position.character &&
				matchEndIndex >= position.character
			) {
				return new Range(
					position.line,

					matchStartIndex,

					position.line,

					matchEndIndex,
				);
			}

			if (
				match.index === localRegexp.lastIndex &&
				match[0].length === 0
			) {
				this._logWarn(
					"Zero-length match detected in word regex fallback, breaking loop.",
				);

				break;
			}

			if (localRegexp.lastIndex === match.index) {
				this._logWarn(
					"Regex lastIndex did not advance in word regex fallback, breaking loop.",
				);

				// Manually advance
				localRegexp.lastIndex++;
			}
		}

		return undefined;
	}

	private _createTextDocumentApiObject(): TextDocument {
		// Capture 'this' (ShimDocumentData instance)
		const data = this;

		const textDoc: TextDocument = {
			get uri() {
				return data.#uri;
			},

			get fileName() {
				return data.#uri.fsPath;
			},

			get isUntitled() {
				return data.#uri.scheme === "untitled";
			},

			get languageId() {
				return data.#languageId;
			},

			get version() {
				return data.#versionId;
			},

			get isClosed() {
				return data.#isClosed;
			},

			get isDirty() {
				return data.#isDirty;
			},

			// encoding is not part of vscode.TextDocument
			// get encoding() { return data.#encoding; },

			save: async (): Promise<boolean> => {
				data._log(`save() called`);

				if (data.#isClosed) throw new Error("Document has been closed");

				const proxy =
					data.#textDocumentApiService?.getMainThreadProxy();

				if (!proxy) {
					data._logError(
						"Cannot save, MainThreadDocuments proxy unavailable.",
					);

					return false;
				}

				try {
					// Use BaseCocoonShim's _convertApiArgToInternal for URI marshalling
					const uriComponents =
						data.#textDocumentApiService?._convertApiArgToInternal(
							data.#uri,
						);

					if (!uriComponents) {
						throw new Error("Failed to convert URI for RPC.");
					}

					const success = await proxy.$trySaveDocument(uriComponents);

					data._log(`save() proxy call returned: ${success}`);

					return success;
				} catch (e: any) {
					data._logError(`Error during save proxy call: ${e}`);

					return false;
				}
			},

			get eol() {
				return data.#eol === "\n" ? EndOfLine.LF : EndOfLine.CRLF;
			},

			get lineCount() {
				return data.#lines.length;
			},

			lineAt: (lineOrPosition: number | Position): TextLine => {
				const line =
					typeof lineOrPosition === "number"
						? lineOrPosition
						: lineOrPosition.line;

				if (line < 0 || line >= data.#lines.length) {
					throw new Error(
						`Illegal value for line number: ${line}. Must be >= 0 and < ${data.#lines.length}`,
					);
				}

				const text = data.#lines[line];

				const range = new Range(line, 0, line, text.length);

				let rangeIncludingLineBreak: Range;

				if (line < data.#lines.length - 1) {
					rangeIncludingLineBreak = new Range(line, 0, line + 1, 0);
				} else {
					rangeIncludingLineBreak = range;
				}

				const match = text.match(/^\s*/);

				const firstNonWhitespaceCharacterIndex = match
					? match[0].length
					: 0;

				const isEmptyOrWhitespace =
					firstNonWhitespaceCharacterIndex === text.length;

				return Object.freeze({
					lineNumber: line,

					text: text,

					range: range,

					rangeIncludingLineBreak: rangeIncludingLineBreak,

					firstNonWhitespaceCharacterIndex:
						firstNonWhitespaceCharacterIndex,

					isEmptyOrWhitespace: isEmptyOrWhitespace,
				});
			},

			offsetAt: (position: Position): number => data._offsetAt(position),

			positionAt: (offset: number): Position => data._positionAt(offset),

			getText: (range?: Range): string =>
				range
					? data._getTextInRange(range)
					: data.#lines.join(data.#eol),

			getWordRangeAtPosition: (
				position: Position,

				regex?: RegExp,
			): Range | undefined =>
				data._getWordRangeAtPosition(position, regex),

			validateRange: (range: Range): Range => data._validateRange(range),

			validatePosition: (position: Position): Position =>
				data._validatePosition(position),
		};

		return Object.freeze(textDoc);
	}
}

// Export classes
// Original JS way
// module.exports = { ShimDocumentService, ShimDocumentData };

// export { ShimDocumentService, ShimDocumentData };
export { ShimDocumentService };
