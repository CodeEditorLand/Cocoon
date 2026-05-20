/**
 * @module Handler/LanguageProviderHandler
 * @description
 * Invokes language feature providers stored in LanguageProviderRegistry.
 * Called for methods matching /^\$provide[A-Z]/ when Mountain requests
 * language intelligence from extensions (hover, completions, definitions, etc.).
 *
 * Mountain passes:
 *   params[0] = provider handle (number)
 *   params[1] = URI object { external: "file:///...", $mid: 1 }
 *   params[2] = Position { Line/line, Character/character } (most features)
 *   params[3] = Context / Options (completion, code actions, etc.)
 */

import { CocoonDevLog } from "../../../Dev/Log.js";
import * as LanguageProviderRegistry from "../../../Language/Provider/Registry.js";

/**
 * Normalize a VS Code range { start: { line, character }, end: {...} } to
 * Mountain's RangeDTO { StartLineNumber, StartColumn, EndLineNumber, EndColumn }.
 *
 * `vscode.Position` is 0-based. Mountain's `RangeDTO` (and the workbench's
 * `IRange` it ultimately surfaces as) is 1-based - same convention stock VS
 * Code's `extHostTypeConverters.ts:128` uses (`start.line + 1`,
 * `start.character + 1`). Without the `+ 1` every hover/completion/decoration
 * range from an extension lands one row too high and one column too far left;
 * the workbench either renders the visual cue against the wrong tokens or
 * silently drops the range when sanitisation collapses 0 → 1.
 */
const NormalizeRange = (
	VsRange: any,
): {
	StartLineNumber: number;

	StartColumn: number;

	EndLineNumber: number;

	EndColumn: number;
} => {
	return {
		StartLineNumber: (VsRange?.start?.line ?? 0) + 1,

		StartColumn: (VsRange?.start?.character ?? 0) + 1,

		EndLineNumber: (VsRange?.end?.line ?? 0) + 1,

		EndColumn: (VsRange?.end?.character ?? 0) + 1,
	};
};

/**
 * Map file extension to VS Code language identifier.
 */
const ResolveLanguageIdentifier = (Extension: string): string => {
	switch (Extension) {
		case "rs":
			return "rust";

		case "ts":
		case "tsx":
			return "typescript";

		case "js":
		case "jsx":
		case "mjs":
			return "javascript";

		case "json":
			return "json";

		case "toml":
			return "toml";

		case "md":
			return "markdown";

		case "py":
			return "python";

		case "go":
			return "go";

		default:
			return Extension || "plaintext";
	}
};

/**
 * Build a VS Code-compatible TextDocument shim from URI and content cache.
 * Extensions calling getText() get real file content; lineAt() returns real lines.
 */
const BuildVsDocument = async (
	UriString: string,

	FsPath: string,

	LanguageIdentifier: string,

	DocumentContentCache: Map<string, string>,
): Promise<any> => {
	const { Position, Range } =
		await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js");

	let CachedContent: string | null = null;

	let CachedLines: string[] | null = null;

	const LoadContent = (): string => {
		if (CachedContent !== null) return CachedContent;

		// Prefer document content cache (has unsaved edits from Mountain)
		const MirrorContent = DocumentContentCache.get(UriString);

		if (MirrorContent !== undefined) {
			CachedContent = MirrorContent;

			return CachedContent;
		}

		// Fallback: read from disk
		try {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const Fs = require("node:fs");

			CachedContent = Fs.readFileSync(FsPath, "utf8") as string;
		} catch {
			CachedContent = "";
		}

		return CachedContent;
	};

	const GetLines = (): string[] => {
		if (CachedLines !== null) return CachedLines;

		CachedLines = LoadContent().split(/\r?\n/);

		return CachedLines;
	};

	return {
		uri: {
			toString: () => UriString,

			fsPath: FsPath,

			external: UriString,

			$mid: 1,

			scheme: "file",

			path: FsPath,
		},

		fileName: FsPath,

		languageId: LanguageIdentifier,

		version: 1,

		isDirty: false,

		isClosed: false,

		eol: 1, // LF
		getText: (_range?: any) => {
			const Text = LoadContent();

			if (!_range) return Text;

			// Range-limited getText: extract substring
			const Lines = GetLines();

			const StartLine = _range?.start?.line ?? 0;

			const StartChar = _range?.start?.character ?? 0;

			const EndLine = _range?.end?.line ?? Lines.length - 1;

			const EndChar =
				_range?.end?.character ?? Lines[EndLine]?.length ?? 0;

			if (StartLine === EndLine) {
				return (Lines[StartLine] ?? "").substring(StartChar, EndChar);
			}

			const Result: string[] = [];

			Result.push((Lines[StartLine] ?? "").substring(StartChar));

			for (let I = StartLine + 1; I < EndLine; I++)
				Result.push(Lines[I] ?? "");

			Result.push((Lines[EndLine] ?? "").substring(0, EndChar));

			return Result.join("\n");
		},

		lineAt: (LineOrPos: number | any) => {
			const LineNum =
				typeof LineOrPos === "number"
					? LineOrPos
					: (LineOrPos?.line ?? 0);

			const Lines = GetLines();

			const LineText = Lines[LineNum] ?? "";

			const FirstNonWS = LineText.search(/\S/);

			return {
				text: LineText,

				lineNumber: LineNum,

				range: new Range(LineNum, 0, LineNum, LineText.length),

				rangeIncludingLineBreak: new Range(LineNum, 0, LineNum + 1, 0),

				firstNonWhitespaceCharacterIndex:
					FirstNonWS === -1 ? LineText.length : FirstNonWS,

				isEmptyOrWhitespace: LineText.trim().length === 0,
			};
		},

		get lineCount() {
			return GetLines().length;
		},

		offsetAt: (Pos: any) => {
			const Lines = GetLines();

			let Offset = 0;

			const TargetLine = Pos?.line ?? 0;

			for (let I = 0; I < TargetLine && I < Lines.length; I++) {
				Offset += (Lines[I] ?? "").length + 1; // +1 for newline
			}

			return Offset + (Pos?.character ?? 0);
		},

		positionAt: (Offset: number) => {
			const Lines = GetLines();

			let Remaining = Offset;

			for (let I = 0; I < Lines.length; I++) {
				const LineText = Lines[I] ?? "";

				if (Remaining <= LineText.length) {
					return new Position(I, Remaining);
				}

				Remaining -= LineText.length + 1;
			}

			return new Position(
				Lines.length - 1,

				(Lines[Lines.length - 1] ?? "").length,
			);
		},

		validateRange: (R: any) => R,

		validatePosition: (P: any) => P,

		getWordRangeAtPosition: (Pos: any, Pattern?: RegExp) => {
			const Lines = GetLines();

			const Line = Lines[Pos?.line ?? 0] ?? "";

			const Regex = Pattern ?? /\w+/g;

			const Col = Pos?.character ?? 0;

			let Match: RegExpExecArray | null;

			// Reset regex for global patterns
			Regex.lastIndex = 0;

			while ((Match = Regex.exec(Line)) !== null) {
				if (
					Match.index <= Col &&
					Match.index + Match[0].length >= Col
				) {
					return new Range(
						Pos.line,

						Match.index,

						Pos.line,

						Match.index + Match[0].length,
					);
				}
			}

			return undefined;
		},

		save: async () => false,
	};
};

/**
 * Invoke a language feature provider stored in LanguageProviderRegistry.
 *
 * Called for methods matching /^\$provide[A-Z]/. Mountain passes:
 *   params[0]  = provider handle (number)
 *   params[1]  = URI object  { external: "file:///...", $mid: 1 }
 *   params[2]  = Position    { Line/line, Character/character }  (most features)
 *   params[3]  = Context / Options (completion, code actions, etc.)
 *
 * Returns the raw VS Code provider result (serialized by the caller).
 */
const InvokeLanguageProvider = async (
	Method: string,

	Parameters: any,

	DocumentContentCache: Map<string, string>,
): Promise<any> => {
	const Args: any[] = Array.isArray(Parameters) ? Parameters : [Parameters];

	const Handle: number = Args[0];

	const Provider = LanguageProviderRegistry.Get(Handle);

	if (!Provider) {
		CocoonDevLog(
			"language-provider",
			`[LanguageProviderHandler] Provider handle ${Handle} not found for ${Method}`,
		);

		return null;
	}

	// Build VS Code-compatible document and position shims from Mountain params.
	const UriObj = Args[1] as { external?: string } | string | undefined;

	const UriString =
		typeof UriObj === "string"
			? UriObj
			: (UriObj?.external ?? "file:///unknown");

	const RawPos = Args[2] as
		| {
				Line?: number;

				line?: number;

				lineNumber?: number;

				Character?: number;

				character?: number;

				column?: number;
		  }
		| undefined;

	// Inverse of `NormalizeRange`: the workbench → Mountain → Cocoon path
	// carries 1-based positions (`IPosition.lineNumber/column`). The
	// extension API's `vscode.Position` is 0-based. Subtract 1 with a floor
	// at 0 so a stale 0-valued payload doesn't underflow to -1 and crash
	// the extension provider on `Position.with`.
	//
	// The dual-shape lookup (PascalCase + camelCase) is intentional - the
	// gRPC layer serialises Rust struct fields as PascalCase, while
	// extHost-shape payloads come through camelCase. Accept both rather
	// than guess which path a given provider call took.
	const SubtractOne = (V: number): number => (V > 0 ? V - 1 : 0);

	const RawLine = RawPos?.Line ?? RawPos?.lineNumber ?? RawPos?.line ?? 1;

	const RawCol =
		RawPos?.Character ?? RawPos?.column ?? RawPos?.character ?? 1;

	const PosLine = SubtractOne(RawLine);

	const PosChar = SubtractOne(RawCol);

	// Real VS Code Position class from @codeeditorland/output.
	const { Position } =
		await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js");

	const VsPosition = new Position(PosLine, PosChar);

	const Ext = UriString.split(".").pop() ?? "";

	const LangId = ResolveLanguageIdentifier(Ext);

	const FsPath = UriString.replace(/^file:\/\//, "");

	const VsDocument = await BuildVsDocument(
		UriString,

		FsPath,

		LangId,

		DocumentContentCache,
	);

	const { CancellationTokenSource } =
		await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/cancellation.js");

	const VsToken = new CancellationTokenSource().token;

	const Context = Args[3];

	try {
		switch (Method) {
			case "$provideHover": {
				if (process.env.Trace) {
					CocoonDevLog(
						"exthost",
						`[DEV:EXTHOST] provideHover dispatch uri=${UriString} line=${VsPosition?.line} char=${VsPosition?.character} providerHasMethod=${typeof (Provider as any).provideHover === "function"}`,
					);
				}

				const Result = await (Provider as any).provideHover?.(
					VsDocument,

					VsPosition,

					VsToken,
				);

				if (process.env.Trace) {
					CocoonDevLog(
						"exthost",
						`[DEV:EXTHOST] provideHover result kind=${Result ? (Array.isArray(Result.contents) ? `array(${Result.contents.length})` : typeof Result.contents) : "null"}`,
					);
				}

				if (!Result) return null;

				// Normalize VS Code Hover { contents, range? } to
				// Mountain HoverResultDTO { Contents: IMarkdownStringDTO[], Range? }
				const RawContents = Result.contents;

				const Contents: Array<{ Value: string }> = Array.isArray(
					RawContents,
				)
					? RawContents.map((C: any) => ({
							Value:
								typeof C === "string"
									? C
									: (C?.value ?? C?.Value ?? ""),
						}))
					: typeof RawContents === "string"
						? [{ Value: RawContents }]
						: [
								{
									Value:
										RawContents?.value ??
										RawContents?.Value ??
										"",
								},
							];

				const VsRange = Result.range ?? null;

				const RangeDTO = VsRange
					? {
							// `+ 1` to match `NormalizeRange` above; the
							// hover anchor range is what the workbench
							// uses to position the popup over the
							// underlined token. 0-based here = popup
							// floats one row above and one column left
							// of the actual symbol.
							StartLineNumber: (VsRange.start?.line ?? 0) + 1,

							StartColumn: (VsRange.start?.character ?? 0) + 1,

							EndLineNumber: (VsRange.end?.line ?? 0) + 1,

							EndColumn: (VsRange.end?.character ?? 0) + 1,
						}
					: undefined;

				return RangeDTO !== undefined
					? { Contents, Range: RangeDTO }
					: { Contents };
			}

			// Mountain sends "$provideCompletion" (Debug fmt of ProviderType::Completion)
			case "$provideCompletion":
			case "$provideCompletions": {
				const Result = await (Provider as any).provideCompletionItems?.(
					VsDocument,

					VsPosition,

					VsToken,

					Context,
				);

				if (!Result) return { Suggestions: [], IsIncomplete: false };

				const RawItems = Array.isArray(Result)
					? Result
					: (Result.items ?? []);

				// Shape: CompletionListDTO { Suggestions: CompletionItemDTO[] }
				return {
					Suggestions: RawItems.map((Item: any) => ({
						Label:
							typeof Item.label === "string"
								? Item.label
								: (Item.label?.label ?? ""),
						Kind: Item.kind ?? 0,
						Detail: Item.detail ?? undefined,
						Documentation:
							typeof Item.documentation === "string"
								? { Value: Item.documentation }
								: Item.documentation?.value !== undefined
									? { Value: Item.documentation.value }
									: undefined,
						InsertText:
							typeof Item.insertText === "string"
								? Item.insertText
								: typeof Item.label === "string"
									? Item.label
									: (Item.label?.label ?? ""),
					})),

					IsIncomplete: Result.isIncomplete ?? false,
				};
			}

			case "$provideDefinition": {
				const Result = await (Provider as any).provideDefinition?.(
					VsDocument,

					VsPosition,

					VsToken,
				);

				if (!Result) return null;

				const Locations = Array.isArray(Result) ? Result : [Result];

				// Shape: Vec<LocationDTO> { Uri: string, Range: RangeDTO }
				return Locations.map((L: any) => ({
					Uri: (L.uri ?? L.targetUri)?.toString?.() ?? UriString,
					Range: NormalizeRange(L.range ?? L.targetSelectionRange),
				}));
			}

			case "$provideReferences": {
				const Result = await (Provider as any).provideReferences?.(
					VsDocument,

					VsPosition,

					Context ?? { includeDeclaration: true },

					VsToken,
				);

				if (!Result) return null;

				return (Result as any[]).map((L: any) => ({
					Uri: L.uri?.toString?.() ?? UriString,
					Range: NormalizeRange(L.range),
				}));
			}

			// Mountain sends "$provideCodeAction" (ProviderType::CodeAction)
			case "$provideCodeAction":
			case "$provideCodeActions": {
				const RangeArg = Args[2];

				const ContextArg = Args[3];

				const Result = await (Provider as any).provideCodeActions?.(
					VsDocument,

					RangeArg,

					ContextArg,

					VsToken,
				);

				return Result ?? null;
			}

			// Mountain sends "$provideDocumentHighlight" (ProviderType::DocumentHighlight)
			case "$provideDocumentHighlight":
			case "$provideDocumentHighlights": {
				const Result = await (
					Provider as any
				).provideDocumentHighlights?.(VsDocument, VsPosition, VsToken);

				return Result ?? null;
			}

			// Mountain sends "$provideDocumentSymbol" (ProviderType::DocumentSymbol)
			case "$provideDocumentSymbol":
			case "$provideDocumentSymbols": {
				const Result = await (Provider as any).provideDocumentSymbols?.(
					VsDocument,

					VsToken,
				);

				return Result ?? null;
			}

			// Mountain sends "$provideWorkspaceSymbol" (ProviderType::WorkspaceSymbol)
			case "$provideWorkspaceSymbol":
			case "$provideWorkspaceSymbols": {
				const Query = Args[1] as string;

				const Result = await (
					Provider as any
				).provideWorkspaceSymbols?.(Query, VsToken);

				return Result ?? null;
			}

			// Mountain: "$provideDocumentFormatting" / "$provideDocumentRangeFormatting"
			case "$provideDocumentFormatting":
			case "$provideDocumentFormattingEdits":
			case "$provideDocumentRangeFormatting":
			case "$provideDocumentRangeFormattingEdits": {
				const RangeArg = Args[2];

				const OptionsArg = Args[3];

				const Fn =
					Method === "$provideDocumentFormattingEdits" ||
					Method === "$provideDocumentFormatting"
						? "provideDocumentFormattingEdits"
						: "provideDocumentRangeFormattingEdits";

				const Result = await (Provider as any)[Fn]?.(
					VsDocument,

					RangeArg,

					OptionsArg,

					VsToken,
				);

				return Result ?? null;
			}

			case "$provideSignatureHelp": {
				const Result = await (Provider as any).provideSignatureHelp?.(
					VsDocument,

					VsPosition,

					VsToken,

					Context,
				);

				return Result ?? null;
			}

			// Mountain sends "$provideRename" (ProviderType::Rename)
			case "$provideRename":
			case "$provideRenameEdits": {
				const NewName = Args[3] as string;

				const Result = await (Provider as any).provideRenameEdits?.(
					VsDocument,

					VsPosition,

					NewName,

					VsToken,
				);

				return Result ?? null;
			}

			// Mountain sends "$provideFoldingRange" (ProviderType::FoldingRange)
			case "$provideFoldingRange":
			case "$provideFoldingRanges": {
				const Result = await (Provider as any).provideFoldingRanges?.(
					VsDocument,

					Context,

					VsToken,
				);

				return Result ?? null;
			}

			// Mountain sends "$provideInlayHint" (ProviderType::InlayHint)
			case "$provideInlayHint":
			case "$provideInlayHints": {
				const RangeArg = Args[2];

				const Result = await (Provider as any).provideInlayHints?.(
					VsDocument,

					RangeArg,

					VsToken,
				);

				return Result ?? null;
			}

			// Mountain sends "$provideCodeLens" (ProviderType::CodeLens)
			case "$provideCodeLens":
			case "$provideCodeLenses": {
				const Result = await (Provider as any).provideCodeLenses?.(
					VsDocument,

					VsToken,
				);

				return Result ?? null;
			}

			case "$provideOnTypeFormatting":
			case "$provideOnTypeFormattingEdits": {
				const TypeChar = Args[2] as string;

				const TypeOptions = Args[3];

				const Result = await (
					Provider as any
				).provideOnTypeFormattingEdits?.(
					VsDocument,

					VsPosition,

					TypeChar,

					TypeOptions ?? {},

					VsToken,
				);

				return Result ?? null;
			}

			case "$provideSelectionRange":
			case "$provideSelectionRanges": {
				const Positions = Args[2];

				const Result = await (Provider as any).provideSelectionRanges?.(
					VsDocument,

					Array.isArray(Positions)
						? Positions.map(
								(P: any) =>
									new Position(
										P?.line ?? P?.Line ?? 0,

										P?.character ?? P?.Character ?? 0,
									),
							)
						: [VsPosition],

					VsToken,
				);

				return Result ?? null;
			}

			case "$provideSemanticTokens":
			case "$provideSemanticTokensFull": {
				const Result = await (
					Provider as any
				).provideDocumentSemanticTokens?.(VsDocument, VsToken);

				return Result ?? null;
			}

			case "$provideCallHierarchy":
			case "$provideCallHierarchyIncomingCalls": {
				const Item = Args[1];

				const Result = await (
					Provider as any
				).provideCallHierarchyIncomingCalls?.(Item, VsToken);

				return Result ?? null;
			}

			case "$provideCallHierarchyOutgoingCalls": {
				const Item = Args[1];

				const Result = await (
					Provider as any
				).provideCallHierarchyOutgoingCalls?.(Item, VsToken);

				return Result ?? null;
			}

			case "$provideTypeHierarchy":
			case "$provideTypeHierarchySupertypes": {
				const Item = Args[1];

				const Result = await (
					Provider as any
				).provideTypeHierarchySupertypes?.(Item, VsToken);

				return Result ?? null;
			}

			case "$provideTypeHierarchySubtypes": {
				const Item = Args[1];

				const Result = await (
					Provider as any
				).provideTypeHierarchySubtypes?.(Item, VsToken);

				return Result ?? null;
			}

			case "$provideLinkedEditingRange":
			case "$provideLinkedEditingRanges": {
				const Result = await (
					Provider as any
				).provideLinkedEditingRanges?.(VsDocument, VsPosition, VsToken);

				return Result ?? null;
			}

			// VS Code ≥1.87 provider types - registered via the new
			// LanguageFeatures.rs arms; Mountain forwards $provideX with the
			// Debug name of ProviderType (e.g. InlineCompletion → $provideInlineCompletion).
			case "$provideInlineCompletion":
			case "$provideInlineCompletionItems": {
				const Context = Args[2];

				const Result = await (
					Provider as any
				).provideInlineCompletionItems?.(
					VsDocument,
					VsPosition,
					Context,
					VsToken,
				);

				return Result ?? null;
			}

			case "$provideInlineEdit":
			case "$provideInlineEdits": {
				const Context = Args[2];

				const Result = await (Provider as any).provideInlineEdits?.(
					VsDocument,
					VsPosition,
					Context,
					VsToken,
				);

				return Result ?? null;
			}

			case "$provideMultiDocumentHighlight":
			case "$provideMultiDocumentHighlights": {
				const OtherDocs = Args[2];

				const Result = await (
					Provider as any
				).provideMultiDocumentHighlights?.(
					VsDocument,
					VsPosition,
					OtherDocs,
					VsToken,
				);

				return Result ?? null;
			}

			case "$provideMappedEdits": {
				const CodeBlocks = Args[2];

				const Context = Args[3];

				const Result = await (Provider as any).provideMappedEdits?.(
					VsDocument,
					CodeBlocks,
					Context,
					VsToken,
				);

				return Result ?? null;
			}

			case "$provideDocumentPasteEdit":
			case "$provideDocumentPasteEdits": {
				const Ranges = Args[2];

				const DataTransfer = Args[3];

				const Context = Args[4];

				const Result = await (
					Provider as any
				).provideDocumentPasteEdits?.(
					VsDocument,
					Ranges,
					DataTransfer,
					Context,
					VsToken,
				);

				return Result ?? null;
			}

			case "$provideDocumentDropEdit":
			case "$provideDocumentDropEdits": {
				const DataTransfer = Args[2];

				const Result = await (
					Provider as any
				).provideDocumentDropEdits?.(
					VsDocument,
					VsPosition,
					DataTransfer,
					VsToken,
				);

				return Result ?? null;
			}

			default:
				CocoonDevLog(
					"language-provider",
					`[LanguageProviderHandler] Unhandled $provide method: ${Method}`,
				);

				return null;
		}
	} catch (Error) {
		CocoonDevLog(
			"language-provider",
			`[LanguageProviderHandler] Provider ${Handle} threw for ${Method}: ${Error instanceof globalThis.Error ? Error.message : String(Error)}`,
		);

		return null;
	}
};

export default InvokeLanguageProvider;
