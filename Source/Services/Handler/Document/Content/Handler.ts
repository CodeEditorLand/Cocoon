/**
 * @module Handler/DocumentContentHandler
 * @description
 * Handles document content mirroring from Mountain notifications:
 * - $acceptModelAdded / document.didOpen - cache initial content
 * - $acceptModelChanged / document.didChange - apply incremental edits
 * - $acceptModelRemoved / document.didClose - remove from cache
 * - $acceptModelSaved / document.didSave - emit event (disk matches cache)
 *
 * The documentContentCache is the source of truth for InvokeLanguageProvider's
 * VsDocument.getText() - it always reflects the latest unsaved editor state.
 *
 * Each handler also emits workspace lifecycle events on the provided
 * WorkspaceEventEmitter so extensions registered via
 * workspace.onDidOpenTextDocument etc. receive real TextDocument objects.
 */

import type { EventEmitter } from "events";

import { CocoonDevLog } from "../../../Dev/Log.js";

/**
 * Infer the languageId from a URI string based on file extension.
 */
const InferLanguageIdentifier = (Uri: string): string => {

	const ExtensionMatch = Uri.match(/\.([^./?#]+)(?:\?|#|$)/);

	if (!ExtensionMatch?.[1]) return "plaintext";

	const Extension = ExtensionMatch[1]!.toLowerCase();

	const LanguageMap: Record<string, string> = {
		ts: "typescript",

		tsx: "typescriptreact",

		js: "javascript",

		jsx: "javascriptreact",

		json: "json",

		jsonc: "jsonc",

		md: "markdown",

		html: "html",

		htm: "html",

		css: "css",

		scss: "scss",

		less: "less",

		xml: "xml",

		yaml: "yaml",

		yml: "yaml",

		toml: "toml",

		rs: "rust",

		py: "python",

		rb: "ruby",

		go: "go",

		java: "java",

		c: "c",

		cpp: "cpp",

		h: "c",

		hpp: "cpp",

		cs: "csharp",

		swift: "swift",

		sh: "shellscript",

		bash: "shellscript",

		zsh: "shellscript",

		ps1: "powershell",

		sql: "sql",

		graphql: "graphql",

		proto: "proto3",

		dockerfile: "dockerfile",

		vue: "vue",

		svelte: "svelte",

		astro: "astro",

		txt: "plaintext",
	};

	return LanguageMap[Extension] ?? "plaintext";
};

/**
 * Build a TextDocument-shaped object suitable for vscode API event listeners.
 * Provides: uri, fileName, languageId, version, getText(), lineAt(), lineCount.
 */
const BuildTextDocument = (
	Uri: string,

	Content: string,

	Version: number = 1,

	LanguageIdentifier?: string,
): TextDocumentShape => {
	const Lines = Content.split(/\r?\n/);

	const FileName = Uri.replace(/^file:\/\//, "");

	const ResolvedLanguage = LanguageIdentifier ?? InferLanguageIdentifier(Uri);

	return {
		uri: {
			scheme: "file",

			path: FileName,

			fsPath: FileName,

			authority: "",

			query: "",

			fragment: "",

			with: () => ({}),

			toString: () => Uri,

			toJSON: () => ({
				scheme: "file",
				path: FileName,
				fsPath: FileName,
			}),
		},

		fileName: FileName,

		languageId: ResolvedLanguage,

		version: Version,

		lineCount: Lines.length,

		getText: (Range?: any): string => {
			if (!Range) return Content;

			const StartLine = Range?.start?.line ?? 0;

			const StartCharacter = Range?.start?.character ?? 0;

			const EndLine = Range?.end?.line ?? Lines.length - 1;

			const EndCharacter =
				Range?.end?.character ?? Lines[EndLine]?.length ?? 0;

			if (StartLine === EndLine) {
				return (Lines[StartLine] ?? "").substring(
					StartCharacter,

					EndCharacter,
				);
			}

			const Result: string[] = [];

			Result.push((Lines[StartLine] ?? "").substring(StartCharacter));

			for (let Index = StartLine + 1; Index < EndLine; Index++) {
				Result.push(Lines[Index] ?? "");
			}

			Result.push((Lines[EndLine] ?? "").substring(0, EndCharacter));

			return Result.join("\n");
		},

		lineAt: (
			LineOrPosition: number | { line: number },
		): {
			text: string;

			lineNumber: number;

			range: any;

			isEmptyOrWhitespace: boolean;
		} => {
			const LineNumber =
				typeof LineOrPosition === "number"
					? LineOrPosition
					: LineOrPosition.line;

			const Text = Lines[LineNumber] ?? "";

			return {
				text: Text,

				lineNumber: LineNumber,

				range: {
					start: { line: LineNumber, character: 0 },

					end: { line: LineNumber, character: Text.length },
				},

				isEmptyOrWhitespace: Text.trim().length === 0,
			};
		},

		isUntitled: false,

		isDirty: false,

		isClosed: false,

		eol: 1, // EndOfLine.LF
		offsetAt: (Position: { line: number; character: number }): number => {
			let Offset = 0;

			for (
				let Index = 0;
				Index < Position.line && Index < Lines.length;
				Index++
			) {
				Offset += (Lines[Index]?.length ?? 0) + 1; // +1 for newline
			}

			return Offset + Position.character;
		},

		positionAt: (Offset: number): { line: number; character: number } => {
			let Remaining = Offset;

			for (let Index = 0; Index < Lines.length; Index++) {
				const LineLength = (Lines[Index]?.length ?? 0) + 1;

				if (Remaining < LineLength) {
					return { line: Index, character: Remaining };
				}

				Remaining -= LineLength;
			}

			return {
				line: Lines.length - 1,

				character: Lines[Lines.length - 1]?.length ?? 0,
			};
		},

		validateRange: (Range: any) => Range,

		validatePosition: (Position: any) => Position,

		getWordRangeAtPosition: () => undefined,

		save: async () => false,
	};
};

/**
 * Shape of the TextDocument object passed to workspace event listeners.
 */
interface TextDocumentShape {
	uri: any;

	fileName: string;

	languageId: string;

	version: number;

	lineCount: number;

	getText: (Range?: any) => string;

	lineAt: (LineOrPosition: number | { line: number }) => any;

	isUntitled: boolean;

	isDirty: boolean;

	isClosed: boolean;

	eol: number;

	offsetAt: (Position: { line: number; character: number }) => number;

	positionAt: (Offset: number) => { line: number; character: number };

	validateRange: (Range: any) => any;

	validatePosition: (Position: any) => any;

	getWordRangeAtPosition: () => undefined;

	save: () => Promise<boolean>;
}

/** Track document versions keyed by URI */
const DocumentVersionMap: Map<string, number> = new Map();

/**
 * Handle document content change from Mountain.
 * Updates the document content cache so InvokeLanguageProvider returns fresh text.
 * Emits "didChangeTextDocument" on the WorkspaceEventEmitter.
 */
const HandleDocumentChange = (
	DocumentContentCache: Map<string, string>,

	Parameters: any,

	WorkspaceEventEmitter?: EventEmitter,
): void => {
	// Mountain sends $acceptModelChanged as [uriComponents, eventData]
	let Uri: string;

	let EventData: any;

	if (Array.isArray(Parameters) && Parameters.length >= 2) {
		Uri =
			Parameters[0]?.external ??
			(Parameters[0]?.scheme && Parameters[0]?.path
				? `${Parameters[0].scheme}://${Parameters[0].authority ?? ""}${Parameters[0].path}`
				: "") ??
			"";

		EventData = Parameters[1];
	} else {
		Uri =
			Parameters?.uri?.external ??
			Parameters?.uri ??
			Parameters?.Uri ??
			"";

		EventData = Parameters;
	}

	const Content: string | undefined =
		EventData?.content ?? EventData?.Content ?? EventData?.text;

	if (Uri && Content !== undefined) {
		DocumentContentCache.set(Uri, Content);
	} else if (Uri && (EventData?.changes || Parameters?.changes)) {
		// Incremental changes - apply edits to cached content
		const Existing = DocumentContentCache.get(Uri) ?? "";

		let Updated = Existing;

		const Changes: any[] = Array.isArray(EventData?.changes)
			? EventData.changes
			: Array.isArray(Parameters?.changes)
				? Parameters.changes
				: [];

		// Apply changes in reverse order (largest offset first) to avoid index shifts
		const Sorted = [...Changes].sort(
			(A: any, B: any) => (B.rangeOffset ?? 0) - (A.rangeOffset ?? 0),
		);

		for (const Change of Sorted) {
			const Offset = Change.rangeOffset ?? 0;

			const Length = Change.rangeLength ?? 0;

			const Text = Change.text ?? "";

			Updated =
				Updated.substring(0, Offset) +
				Text +
				Updated.substring(Offset + Length;
		}

		DocumentContentCache.set(Uri, Updated;
	}

	// Emit workspace event with updated content
	if (Uri && WorkspaceEventEmitter) {
		const CurrentVersion = (DocumentVersionMap.get(Uri) ?? 1) + 1;

		DocumentVersionMap.set(Uri, CurrentVersion;

		const CachedContent = DocumentContentCache.get(Uri) ?? "";

		const Document = BuildTextDocument(Uri, CachedContent, CurrentVersion;

		WorkspaceEventEmitter.emit("didChangeTextDocument", {
			document: Document,
			contentChanges: EventData?.changes ?? Parameters?.changes ?? [],
			reason: undefined,
		};
	}
};

/**
 * Handle document open from Mountain - cache initial content.
 * Emits "didOpenTextDocument" on the WorkspaceEventEmitter.
 */
const HandleDocumentOpen = (
	DocumentContentCache: Map<string, string>,

	Parameters: any,

	WorkspaceEventEmitter?: EventEmitter,
): void => {
	// $acceptModelAdded sends an array of DocumentStateDTOs
	const Models = Array.isArray(Parameters) ? Parameters : [Parameters];

	for (const Model of Models) {
		// DocumentStateDTO uses URI (PascalCase, serde rename_all)
		const Uri: string =
			Model?.URI?.toString?.() ??
			Model?.URI ??
			Model?.uri?.external ??
			Model?.uri ??
			Model?.Uri ??
			"";

		// Content can be: Lines (Vec<String>), content (String), text (String)
		const Lines = Model?.Lines ?? Model?.lines;

		const EOL = Model?.EOL ?? Model?.eol ?? "\n";

		let Content: string | undefined;

		if (Array.isArray(Lines)) {
			Content = Lines.join(EOL;
		} else {
			Content = Model?.content ?? Model?.Content ?? Model?.text;
		}

		const LanguageIdentifier: string | undefined =
			Model?.LanguageIdentifier ?? Model?.languageId ?? Model?.language;

		if (Uri && Content !== undefined) {
			DocumentContentCache.set(Uri, Content;

			DocumentVersionMap.set(Uri, 1);

			CocoonDevLog(
				"document",

				`[DocumentContentHandler] Document opened: ${Uri.slice(-60)} (${Content.length} chars)`,
			;

			if (WorkspaceEventEmitter) {
				const Document = BuildTextDocument(
					Uri,

					Content,

					1,

					LanguageIdentifier,
				;

				WorkspaceEventEmitter.emit("didOpenTextDocument", Document;
			}
		}
	}
};

/**
 * Handle document close from Mountain - remove from cache.
 * Emits "didCloseTextDocument" on the WorkspaceEventEmitter.
 */
const HandleDocumentClose = (
	DocumentContentCache: Map<string, string>,

	Parameters: any,

	WorkspaceEventEmitter?: EventEmitter,
): void => {
	// $acceptModelRemoved sends [uriComponents]
	const Items = Array.isArray(Parameters) ? Parameters : [Parameters];

	for (const Item of Items) {
		const Uri: string =
			Item?.external ??
			Item?.uri?.external ??
			Item?.uri ??
			Item?.Uri ??
			"";

		if (Uri) {
			// Build document from cache before removing
			if (WorkspaceEventEmitter) {
				const CachedContent = DocumentContentCache.get(Uri) ?? "";

				const Version = DocumentVersionMap.get(Uri) ?? 1;

				const Document = BuildTextDocument(Uri, CachedContent, Version;

				WorkspaceEventEmitter.emit("didCloseTextDocument", Document;
			}

			DocumentContentCache.delete(Uri;

			DocumentVersionMap.delete(Uri;
		}
	}
};

/**
 * Handle document save from Mountain.
 * Emits "didSaveTextDocument" on the WorkspaceEventEmitter.
 * Content on disk matches cache so no cache update is needed.
 */
const HandleDocumentSave = (
	DocumentContentCache: Map<string, string>,

	Parameters: any,

	WorkspaceEventEmitter?: EventEmitter,
): void => {
	if (!WorkspaceEventEmitter) return;

	// Parameters can be a URI string, an object with uri, or an array
	const Items = Array.isArray(Parameters) ? Parameters : [Parameters];

	for (const Item of Items) {
		const Uri: string =
			typeof Item === "string"
				? Item
				: (Item?.external ??
					Item?.uri?.external ??
					Item?.uri ??
					Item?.Uri ??
					"";

		if (Uri) {
			const CachedContent = DocumentContentCache.get(Uri) ?? "";

			const Version = DocumentVersionMap.get(Uri) ?? 1;

			const Document = BuildTextDocument(Uri, CachedContent, Version;

			WorkspaceEventEmitter.emit("didSaveTextDocument", Document;
		}
	}
};

/**
 * Get cached document content, or null if not cached.
 */
const GetDocumentContent = (
	DocumentContentCache: Map<string, string>,

	Uri: string,
): string | null => {
	return DocumentContentCache.get(Uri) ?? null;
};

export default {
	HandleDocumentChange,

	HandleDocumentOpen,

	HandleDocumentClose,

	HandleDocumentSave,

	GetDocumentContent,

	BuildTextDocument,
};
