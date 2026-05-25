/**
 * @module Handler/VscodeAPI/WorkspaceNamespace/TextDocument
 * @description
 * Document lifecycle operations for the workspace shim:
 * openTextDocument, saveAll, applyEdit, updateWorkspaceFolders, and all
 * document/file/notebook event subscriptions.
 */

import { promises as FsPromises } from "node:fs";

import type { HandlerContext } from "../../../../Handler/Context.js";
import { ExtractFsPath, Route } from "../File/System/Route.js";
import { Call, EventSubscriber } from "../Helpers.js";
import {
	DeriveLanguageIdFromUri,
	FireOnLanguageActivation,
} from "../Language/Activation.js";

export const BuildOpenTextDocument =
	(Context: HandlerContext) => async (UriOrPath: any) => {
		// Handle `openTextDocument({ language, content })` - creates an untitled
		// document with pre-populated content and the specified language.
		// VS Code's overload: `openTextDocument(options: { language?: string, content?: string })`.
		if (
			UriOrPath &&
			typeof UriOrPath === "object" &&
			!UriOrPath.scheme &&
			!UriOrPath.path &&
			!UriOrPath.fsPath &&
			(typeof UriOrPath.language === "string" ||
				typeof UriOrPath.content === "string")
		) {
			const InlineContent =
				typeof UriOrPath.content === "string" ? UriOrPath.content : "";
			const InlineLang =
				typeof UriOrPath.language === "string"
					? UriOrPath.language
					: "plaintext";
			const UntitledKey = `untitled:Untitled-${Date.now()}`;
			Context.DocumentContentCache.set(UntitledKey, InlineContent);
			// Add to workspace.textDocuments so extensions iterating all open docs see it.
			if (!Array.isArray((Context as any).__textDocuments))
				(Context as any).__textDocuments = [];
			const UriShape = {
				toString: () => UntitledKey,
				fsPath: "",
				scheme: "untitled",
				path: UntitledKey.slice("untitled:".length),
				external: UntitledKey,
			};
			const Lines = InlineContent.split("\n");
			const LineStarts: number[] = [0];
			for (let I = 0; I < InlineContent.length; I++) {
				if (InlineContent.charCodeAt(I) === 10) LineStarts.push(I + 1);
			}
			const PositionAt = (Off: number) => {
				let Lo = 0,
					Hi = LineStarts.length - 1;
				while (Lo < Hi) {
					const Mid = (Lo + Hi + 1) >>> 1;
					if (LineStarts[Mid]! <= Off) Lo = Mid;
					else Hi = Mid - 1;
				}
				return { line: Lo, character: Off - LineStarts[Lo]! };
			};
			const OffsetAt = (P: any) => {
				const L = Math.max(0, Math.min(P?.line ?? 0, Lines.length - 1));
				return Math.max(0, (LineStarts[L] ?? 0) + (P?.character ?? 0));
			};
			const Doc = {
				uri: UriShape,
				fileName: UntitledKey,
				languageId: InlineLang,
				isDirty: false,
				isClosed: false,
				isUntitled: true,
				version: 1,
				eol: 1,
				lineCount: Lines.length,
				getText: () => InlineContent,
				positionAt: PositionAt,
				offsetAt: OffsetAt,
				lineAt: (N: any) => {
					const Ln = typeof N === "number" ? N : (N?.line ?? 0);
					const T = Lines[Ln] ?? "";
					return {
						lineNumber: Ln,
						text: T,
						range: {
							start: { line: Ln, character: 0 },
							end: { line: Ln, character: T.length },
						},
						firstNonWhitespaceCharacterIndex:
							T.search(/\S/) < 0 ? T.length : T.search(/\S/),
						isEmptyOrWhitespace: T.trim().length === 0,
					};
				},
				getWordRangeAtPosition: () => undefined,
				validateRange: (R: any) => R,
				validatePosition: (P: any) => P,
				save: async () => false,
			};
			(Context as any).__textDocuments.push(Doc);
			// Fire didOpenTextDocument so extensions subscribed to onDidOpenTextDocument see it.
			setImmediate(() => {
				try {
					Context.WorkspaceEventEmitter?.emit(
						"didOpenTextDocument",
						Doc,
					);
				} catch {}
			});
			return Doc;
		}

		const UriString =
			typeof UriOrPath === "string"
				? UriOrPath
				: (UriOrPath?.toString?.() ?? "");

		// `untitled:` scheme - blank document, no backend needed.
		if (UriString.startsWith("untitled:") || UriString === "") {
			const Content = Context.DocumentContentCache.get(UriString) ?? "";
			const ULines = Content.split("\n");
			const UntitledLang = DeriveLanguageIdFromUri(UriString);
			return {
				uri: UriOrPath ?? {
					toString: () => UriString,
					scheme: "untitled",
					path: UriString.slice("untitled:".length),
				},
				fileName: UriString,
				languageId: UntitledLang,
				isDirty: false,
				isClosed: false,
				isUntitled: true,
				version: 1,
				eol: 1,
				lineCount: ULines.length,
				getText: () => Content,
				positionAt: (Off: number) => {
					let Rem = Off;
					for (let I = 0; I < ULines.length; I++) {
						const L = ULines[I]!.length + 1;
						if (Rem < L) return { line: I, character: Rem };
						Rem -= L;
					}
					return {
						line: ULines.length - 1,
						character: ULines[ULines.length - 1]?.length ?? 0,
					};
				},
				offsetAt: (P: any) => {
					let O = 0;
					for (let I = 0; I < (P?.line ?? 0); I++)
						O += (ULines[I]?.length ?? 0) + 1;
					return O + (P?.character ?? 0);
				},
				lineAt: (N: any) => {
					const Ln = typeof N === "number" ? N : (N?.line ?? 0);
					const T = ULines[Ln] ?? "";
					return {
						lineNumber: Ln,
						text: T,
						range: {
							start: { line: Ln, character: 0 },
							end: { line: Ln, character: T.length },
						},
						firstNonWhitespaceCharacterIndex:
							T.search(/\S/) < 0 ? T.length : T.search(/\S/),
						isEmptyOrWhitespace: T.trim().length === 0,
					};
				},
				getWordRangeAtPosition: () => undefined,
				validateRange: (R: any) => R,
				validatePosition: (P: any) => P,
				save: async () => false,
			};
		}

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

			// Check for a registered TextDocumentContentProvider for this scheme.
			// Extensions like vscode.git register `git:` scheme providers.
			// Calling the provider directly is faster than a Mountain round-trip
			// (no gRPC, no 10s timeout on miss).
			const Scheme = (() => {
				if (typeof UriOrPath === "object" && (UriOrPath as any)?.scheme)
					return String((UriOrPath as any).scheme);
				if (typeof UriString === "string") {
					const C = UriString.indexOf(":");
					if (C > 0 && C < 32) return UriString.slice(0, C);
				}
				return "file";
			})();
			if (Scheme !== "file") {
				const Provider = (Context.ExtensionRegistry as any)?.get(
					`__textDocumentContentProvider:${Scheme}`,
				);
				if (
					Provider &&
					typeof Provider.provideTextDocumentContent === "function"
				) {
					const CancellationToken = {
						isCancellationRequested: false,
						onCancellationRequested: () => ({ dispose: () => {} }),
					};
					let ProviderUri: unknown = UriOrPath;
					try {
						const API = (globalThis as any).__cocoonVscodeAPI;
						if (API?.Uri && UriString)
							ProviderUri = API.Uri.parse(UriString);
					} catch {}
					try {
						const Content =
							await Provider.provideTextDocumentContent(
								ProviderUri,
								CancellationToken,
							);
						Text =
							typeof Content === "string"
								? Content
								: (Content ?? "");
					} catch {
						Text = "";
					}
					// Cache and build document without going to Mountain.
					if (Text !== undefined) {
						Context.DocumentContentCache.set(UriString, Text);
					} else {
						Text = "";
					}
				}
			}

			// Tier-split match: `file://` with no custom provider reads
			// through Cocoon's own Node backend; everything else (Mountain-
			// owned schemes, custom-provider schemes) routes through the
			// FileSystem.ReadFile gRPC effect.
			const Decision = Route(UriOrPath);

			// Only go to disk/Mountain if content wasn't served by a provider.
			// @ts-ignore - `Text` may have been set above by content provider.
			if (Text === undefined) {
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
							await Call<unknown>(
								Context,
								"FileSystem.ReadFile",
								[UriString],
							),
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

		const PositionAt = (
			Offset: number,
		): { line: number; character: number } => {
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

			const Clamped = Math.max(
				0,

				Math.min(Math.floor(L), Lines.length - 1),
			);

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

				const Start = OffsetAt(
					Range.start ?? { line: 0, character: 0 },
				);

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
		// Route through Workspace.SaveAll which dispatches to Sky's
		// `sky://workspace/saveAll` handler (round-trip via workbench command).
		try {
			await Call<void>(Context, "Workspace.SaveAll", [
				_IncludeUntitled ?? false,
			]);
		} catch {
			// Fallback via request (not SendToMountain notification).
			// A notification fire-and-forget for saveAll falls to the catch-all
			// Tauri re-emit and the save never executes - the handler for saveAll
			// in CreateEffectForRequest/Workspace.rs is request-response only.
			Context.MountainClient?.sendRequest("Workspace.SaveAll", [
				_IncludeUntitled ?? false,
			]).catch(() => {});
		}

		return true;
	};

export const BuildApplyEdit =
	(Context: HandlerContext) =>
	async (
		Edit: unknown,
		_Metadata?: { isRefactoring?: boolean; label?: string },
	): Promise<boolean> => {
		// Route through Mountain's `applyEdit` Track effect which does a
		// round-trip to Sky so the edit is applied to the Monaco model
		// before the extension's awaited promise resolves. Using
		// sendRequest (not SendToMountain fire-and-forget) so the caller
		// can `await` the actual success boolean.
		//
		// Stock VS Code's `vscode.workspace.applyEdit` returns
		// `Thenable<boolean>` reflecting whether ALL edits applied
		// successfully (or `false` when a conflict raced). Previously this
		// always returned `true`, even when Mountain rejected - extensions
		// (format-on-save, organize-imports, rename refactor) trusted the
		// false return path to retry / surface error UI and silently
		// applied stale edits when the workbench had already mutated the
		// model.
		try {
			const Result = await Call<boolean>(Context, "applyEdit", [Edit]);
			// Mountain may return `null` if the round-trip succeeded but
			// the Sky-side BulkEditService returned undefined. Treat
			// missing as success (upstream's MainThreadBulkEdits does
			// the same - undefined → true).
			if (typeof Result === "boolean") return Result;
			return true;
		} catch {
			// Mountain not connected or Sky rejected. Fall back to a
			// notification (best-effort, no return path) so simple edits
			// still apply even when the sendRequest path is unavailable.
			Context.SendToMountain("workspace.applyEdit", Edit).catch(() => {});
			return false;
		}
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
	// `onWillSaveTextDocument` must add the listener to `__willSaveListeners`
	// (the array the notification handler iterates for `waitUntil` support)
	// AND also emit the event on WorkspaceEventEmitter so plain subscribers
	// still fire. Without the `__willSaveListeners` path, format-on-save
	// extensions that call `event.waitUntil(Promise<TextEdit[]>)` inside
	// their listener never deliver their edits before the disk write.
	onWillSaveTextDocument: (
		Listener: (...Arguments: any[]) => any,
		ThisArg?: unknown,
		Disposables?: { push: (D: { dispose: () => void }) => unknown },
	) => {
		const Bound =
			ThisArg === undefined
				? Listener
				: (Listener as (...A: any[]) => any).bind(ThisArg);
		if (!Array.isArray((Context as any).__willSaveListeners)) {
			(Context as any).__willSaveListeners = [];
		}
		(Context as any).__willSaveListeners.push(Bound);
		const Subscription = {
			dispose: () => {
				const All = (Context as any).__willSaveListeners as any[];
				if (Array.isArray(All)) {
					const Idx = All.indexOf(Bound);
					if (Idx !== -1) All.splice(Idx, 1);
				}
				Context.WorkspaceEventEmitter.removeListener(
					"willSaveTextDocument",
					Bound,
				);
			},
		};
		if (Disposables && typeof Disposables.push === "function") {
			Disposables.push(Subscription);
		}
		return Subscription;
	},
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
