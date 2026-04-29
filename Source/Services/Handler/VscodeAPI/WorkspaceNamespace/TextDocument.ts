/**
 * @module Handler/VscodeAPI/WorkspaceNamespace/TextDocument
 * @description
 * Document lifecycle operations for the workspace shim:
 * openTextDocument, saveAll, applyEdit, updateWorkspaceFolders, and all
 * document/file/notebook event subscriptions.
 */

import { promises as FsPromises } from "node:fs";

import type { HandlerContext } from "../../HandlerContext.js";
import { ExtractFsPath, Route } from "./FileSystemRoute.js";
import { Call, EventSubscriber } from "./Helpers.js";
import {
	DeriveLanguageIdFromUri,
	FireOnLanguageActivation,
} from "./LanguageActivation.js";

export const BuildOpenTextDocument =
	(Context: HandlerContext) => async (UriOrPath: any) => {
		const UriString =
			typeof UriOrPath === "string"
				? UriOrPath
				: (UriOrPath?.toString?.() ?? "");

		// Cache hit short-circuits every backend - typed model registry
		// already holds the latest contents.
		const Cached = Context.DocumentContentCache.get(UriString);
		let Text: string;
		if (Cached !== undefined) {
			Text = Cached;
		} else {
			// Mountain serialises `Vec<u8>` as a JSON number-array, not a
			// string. The native path returns a real string; the Mountain
			// path needs `Buffer.from(...).toString("utf8")` to match.
			// Without this conversion, `getText()` returns the raw array
			// and downstream consumers (jsonc-parser, npm task detection,
			// language-features schema validators) fail to parse the file.
			const DecodeRaw = (Raw: unknown): string => {
				if (typeof Raw === "string") return Raw;
				if (Array.isArray(Raw)) {
					return Buffer.from(Raw as number[]).toString("utf8");
				}
				if (Raw instanceof Uint8Array) {
					return Buffer.from(Raw).toString("utf8");
				}
				if (Raw && typeof Raw === "object") {
					const Maybe = (Raw as { content?: unknown }).content;
					if (Array.isArray(Maybe)) {
						return Buffer.from(Maybe as number[]).toString("utf8");
					}
					if (Maybe instanceof Uint8Array) {
						return Buffer.from(Maybe).toString("utf8");
					}
					if (typeof Maybe === "string") return Maybe;
				}
				return Raw == null ? "" : String(Raw);
			};
			// Tier-split match: `file://` with no custom provider reads
			// through Cocoon's own Node backend; everything else (Mountain-
			// owned schemes, custom-provider schemes) routes through the
			// FileSystem.ReadFile gRPC effect.
			const Decision = Route(UriOrPath);
			if (Decision === "native") {
				const Path = ExtractFsPath(UriOrPath);
				if (Path !== undefined) {
					if (process.env["Trace"]) {
						process.stdout.write(
							`[DEV:FS-ROUTE] op=openTextDocument route=native uri=${UriString}\n`,
						);
					}
					try {
						Text = await FsPromises.readFile(Path, "utf8");
					} catch {
						Text = "";
					}
				} else {
					Text = DecodeRaw(
						await Call<unknown>(Context, "FileSystem.ReadFile", [
							UriString,
						]),
					);
				}
			} else {
				if (process.env["Trace"]) {
					process.stdout.write(
						`[DEV:FS-ROUTE] op=openTextDocument route=mountain uri=${UriString}\n`,
					);
				}
				Text = DecodeRaw(
					await Call<unknown>(Context, "FileSystem.ReadFile", [
						UriString,
					]),
				);
			}
		}

		// Derive languageId from the URI so Monaco's tokeniser, the
		// language-features extensions, and the `onLanguage:<id>`
		// activation-event dispatcher all see the real language
		// instead of a blanket `plaintext`. Fire the matching
		// activation event in the background so language-gated
		// extensions (vscode.typescript-language-features,
		// redhat.vscode-yaml, rust-analyzer, …) activate on document
		// open just like they do in stock VS Code.
		const LanguageId = DeriveLanguageIdFromUri(UriString);
		if (LanguageId !== "plaintext") {
			FireOnLanguageActivation(Context, LanguageId);
		}

		// Pre-compute line-start offsets so positionAt/offsetAt/lineAt are
		// O(log n) per call instead of re-scanning the buffer. npm's
		// readScripts calls positionAt twice per script (start+end of every
		// scripts entry) so a 30-script root package.json walks ~60 times.
		const LineStarts: number[] = [0];
		for (let I = 0; I < Text.length; I++) {
			if (Text.charCodeAt(I) === 10 /* \n */) LineStarts.push(I + 1);
		}
		const Lines = Text.split("\n");
		const ClampOffset = (Offset: number): number =>
			Math.max(0, Math.min(Math.floor(Offset || 0), Text.length));
		const PositionAt = (Offset: number): { line: number; character: number } => {
			const Clamped = ClampOffset(Offset);
			// Binary search for the line whose start is <= Clamped.
			let Lo = 0;
			let Hi = LineStarts.length - 1;
			while (Lo < Hi) {
				const Mid = (Lo + Hi + 1) >>> 1;
				if (LineStarts[Mid]! <= Clamped) Lo = Mid;
				else Hi = Mid - 1;
			}
			return { line: Lo, character: Clamped - LineStarts[Lo]! };
		};
		const OffsetAt = (Position: {
			line?: number;
			character?: number;
		}): number => {
			const L = Math.max(
				0,
				Math.min(Math.floor(Position?.line ?? 0), Lines.length - 1),
			);
			const C = Math.max(0, Math.floor(Position?.character ?? 0));
			const LineLength = Lines[L]?.length ?? 0;
			return ClampOffset((LineStarts[L] ?? 0) + Math.min(C, LineLength));
		};
		const LineAt = (LineOrPosition: number | { line?: number }) => {
			const L =
				typeof LineOrPosition === "number"
					? LineOrPosition
					: (LineOrPosition?.line ?? 0);
			const Clamped = Math.max(0, Math.min(Math.floor(L), Lines.length - 1));
			const Content = Lines[Clamped] ?? "";
			const Start = { line: Clamped, character: 0 };
			const End = { line: Clamped, character: Content.length };
			return {
				lineNumber: Clamped,
				text: Content,
				range: { start: Start, end: End },
				rangeIncludingLineBreak: {
					start: Start,
					end:
						Clamped < Lines.length - 1
							? { line: Clamped + 1, character: 0 }
							: End,
				},
				firstNonWhitespaceCharacterIndex: Content.search(/\S/) >>> 0,
				isEmptyOrWhitespace: Content.trim().length === 0,
			};
		};
		const ValidateRange = (Range: any) => Range;
		const ValidatePosition = (Position: any) => Position;
		const GetWordRangeAtPosition = (
			Position: { line?: number; character?: number },
			Regex?: RegExp,
		) => {
			const L = Math.max(
				0,
				Math.min(Math.floor(Position?.line ?? 0), Lines.length - 1),
			);
			const Line = Lines[L] ?? "";
			const C = Math.max(0, Math.floor(Position?.character ?? 0));
			const Pattern = Regex ?? /[A-Za-z_$][\w$]*/g;
			Pattern.lastIndex = 0;
			let Match: RegExpExecArray | null;
			while ((Match = Pattern.exec(Line)) !== null) {
				const Start = Match.index;
				const End = Start + Match[0].length;
				if (C >= Start && C <= End) {
					return {
						start: { line: L, character: Start },
						end: { line: L, character: End },
					};
				}
				if (Match.index === Pattern.lastIndex) Pattern.lastIndex++;
			}
			return undefined;
		};
		return {
			uri: UriOrPath,
			fileName: UriString,
			languageId: LanguageId,
			isDirty: false,
			isClosed: false,
			isUntitled: false,
			version: 1,
			eol: 1,
			lineCount: Lines.length,
			getText: (Range?: {
				start?: { line?: number; character?: number };
				end?: { line?: number; character?: number };
			}) => {
				if (!Range) return Text;
				const Start = OffsetAt(Range.start ?? { line: 0, character: 0 });
				const End = OffsetAt(
					Range.end ?? {
						line: Lines.length - 1,
						character: Lines[Lines.length - 1]?.length ?? 0,
					},
				);
				return Text.slice(Math.min(Start, End), Math.max(Start, End));
			},
			positionAt: PositionAt,
			offsetAt: OffsetAt,
			lineAt: LineAt,
			getWordRangeAtPosition: GetWordRangeAtPosition,
			validateRange: ValidateRange,
			validatePosition: ValidatePosition,
			save: async () => true,
		};
	};

export const BuildSaveAll =
	(Context: HandlerContext) => async (_IncludeUntitled?: boolean) => {
		await Call<void>(Context, "Document.Save", []);
		return true;
	};

export const BuildApplyEdit =
	(Context: HandlerContext) => async (_Edit: unknown) => {
		// No dedicated dispatcher route yet - fire as notification so Wind
		// can subscribe via the cocoon:workspace.applyEdit Tauri event.
		Context.SendToMountain("workspace.applyEdit", _Edit).catch(() => {});
		return true;
	};

export const BuildUpdateWorkspaceFolders =
	(
		Context: HandlerContext,
		ReadFolders: () => Array<{ uri: unknown; name: string; index: number }>,
	) =>
	(
		Start: number,
		DeleteCount: number | null | undefined,
		...ToAdd: Array<{ uri?: unknown; name?: string }>
	) => {
		const Current = ReadFolders();
		const RemoveCount =
			typeof DeleteCount === "number" && DeleteCount > 0
				? Math.min(DeleteCount, Math.max(Current.length - Start, 0))
				: 0;
		const Removals = Current.slice(Start, Start + RemoveCount).map(
			(Folder) => ({
				uri: {
					value:
						typeof Folder?.uri === "string"
							? Folder.uri
							: ((
									(Folder?.uri as Record<string, unknown>)?.[
										"toString"
									] as (() => string) | undefined
								)?.call(Folder?.uri) ?? String(Folder?.uri)),
				},
			}),
		);
		const Additions = ToAdd.map((Folder) => {
			const Raw = Folder?.uri;
			const Serialized =
				typeof Raw === "string"
					? Raw
					: ((
							(Raw as Record<string, unknown>)?.["toString"] as
								| (() => string)
								| undefined
						)?.call(Raw) ?? String(Raw ?? ""));
			return { uri: { value: Serialized }, name: Folder?.name ?? "" };
		});
		Context.MountainClient?.sendRequest("$updateWorkspaceFolders", {
			additions: Additions,
			removals: Removals,
		}).catch((Error) => {
			const Message =
				Error instanceof globalThis.Error
					? Error.message
					: String(Error);
			try {
				process.stdout.write(
					`[LandFix:WsNs] updateWorkspaceFolders failed: ${Message}\n`,
				);
			} catch {}
		});
		return true;
	};

export const BuildDocumentEventMembers = (Context: HandlerContext) => ({
	onDidOpenTextDocument: EventSubscriber(Context, "didOpenTextDocument"),
	onDidCloseTextDocument: EventSubscriber(Context, "didCloseTextDocument"),
	onDidChangeTextDocument: EventSubscriber(Context, "didChangeTextDocument"),
	onDidSaveTextDocument: EventSubscriber(Context, "didSaveTextDocument"),
	onWillSaveTextDocument: EventSubscriber(Context, "willSaveTextDocument"),
	onDidCreateFiles: EventSubscriber(Context, "didCreateFiles"),
	onDidDeleteFiles: EventSubscriber(Context, "didDeleteFiles"),
	onDidRenameFiles: EventSubscriber(Context, "didRenameFiles"),
	onWillRenameFiles: EventSubscriber(Context, "willRenameFiles"),
	onWillCreateFiles: EventSubscriber(Context, "willCreateFiles"),
	onWillDeleteFiles: EventSubscriber(Context, "willDeleteFiles"),
	onDidOpenNotebookDocument: EventSubscriber(
		Context,
		"didOpenNotebookDocument",
	),
	onDidCloseNotebookDocument: EventSubscriber(
		Context,
		"didCloseNotebookDocument",
	),
	onDidChangeNotebookDocument: EventSubscriber(
		Context,
		"didChangeNotebookDocument",
	),
	onDidSaveNotebookDocument: EventSubscriber(
		Context,
		"didSaveNotebookDocument",
	),
	onWillSaveNotebookDocument: EventSubscriber(
		Context,
		"willSaveNotebookDocument",
	),
});
