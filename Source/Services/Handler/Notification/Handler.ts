/**
 * @module Services/Handler/NotificationHandler
 * @description
 * Fan-out for Mountain → Cocoon notifications. Every incoming method is
 * translated into a domain event on either the shared `Emitter` (reached
 * by `createFileSystemWatcher`, `createWebviewPanel`, etc.) or the
 * `WorkspaceEventEmitter` (reached by `onDidChange*TextDocument*` and the
 * workspace-folder subscriber chain).
 *
 * ## Channels
 *
 * | Emitter                  | Events                                                         |
 * | ------------------------ | -------------------------------------------------------------- |
 * | `Emitter`                | `extensionChanged`, `configurationChanged`, `windowFocused`, `windowBlurred`, `systemShutdown`, `webview.message:<handle>`, `webview.dispose:<handle>`, `webview.viewState:<handle>`, `fileWatcher:<handle>`, `debug.didStartSession`, `debug.didTerminateSession`, `debug.didChangeActiveSession`, `debug.didReceiveCustomEvent`, `debug.didChangeBreakpoints`, `debug.didChangeActiveStackItem`, `customEditor.saveDocument`, `customEditor.saveDocumentAs`, `customEditor.revertCustomDocument`, `customEditor.backupCustomDocument`, `customEditor.willSaveCustomDocument`, `customEditor.didChangeCustomDocument`, `unknownNotification` |
 * | `WorkspaceEventEmitter`  | `didOpenTextDocument`, `didChangeTextDocument`, `didCloseTextDocument`, `didSaveTextDocument` |
 *
 * ## Why two emitters
 *
 * Text-document events are high-volume (one per keystroke when an
 * extension is in `onDidChangeTextDocument`) and have a distinct
 * subscriber population - they must not block on
 * extension-lifecycle listeners. Keeping them on a dedicated emitter
 * bounds the worst-case fan-out cost.
 *
 * ## Subscription contracts
 *
 * All emitters use Node's built-in `EventEmitter`. Subscribers added via
 * the vscode API shims (in `Handler/VscodeAPI/*`) return a VS Code
 * `Disposable` whose `dispose()` calls `Emitter.removeListener`. The
 * per-event memory leak check (`MaxListeners`) is left at the Node
 * default (10) - extensions that register >10 listeners receive a
 * runtime warning and should rethink their design.
 *
 * ## Unknown methods
 *
 * Methods that do not match any case land in the `default` arm, are
 * printed to `process.stdout` (survives esbuild's `drop: ["console"]`
 * in production), and re-emitted as `unknownNotification` so a plugin
 * / telemetry listener can surface the gap.
 */

import type { EventEmitter } from "events";

import type { HandlerContext } from "../Handler/Context.js";
import * as WindowNamespaceModule from "../VscodeAPI/Window/Namespace.js";

type WorkspaceFolderWire = {
	uri?: string;
	name?: string;
	index?: number;
};

type WorkspaceDeltaPayload = {
	added?: WorkspaceFolderWire[];
	removed?: WorkspaceFolderWire[];
};

/**
 * Atom I3 - last-resort uncaught-exception handler.
 *
 * The project's `PatchProcess/Patcher.ts` registers one via an Effect, but
 * esbuild tree-shakes that path out of `Cocoon/Main.js` (bundle scan confirms
 * zero `uncaughtException` strings). Without a handler, Node's default is
 * log-and-exit-1, which is exactly how we've been losing Cocoon when the
 * built-in `gulp` extension throws on workspace folder changes.
 *
 * This module-level registration is intentionally colocated with the
 * notification dispatch because that's where the explosive event cascades
 * fan out to extension callbacks. One handler is enough - Node dedupes via
 * reference and we only register once per process.
 */
const { URI: LazyURI } =
	await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js");
type UriObject = {
	scheme: string;
	authority: string;
	path: string;
	query: string;
	fragment: string;
	fsPath: string;
	toString(): string;
};
// Minimal stub for when LazyURI.parse is unavailable (import failed or not
// yet resolved). Enough shape for extensions to call fsPath / toString().
const MakeUriStub = (Raw: string): UriObject => {
	const Path = Raw.replace(/^file:\/\//, "");
	return {
		scheme: Raw.startsWith("file://") ? "file" : "unknown",
		authority: "",
		path: Path,
		query: "",
		fragment: "",
		fsPath: Path,
		toString: () => Raw,
	};
};

const HydrateUri = (Raw: string | UriObject | undefined): UriObject | null => {
	if (!Raw) return null;
	if (typeof Raw === "string") {
		try {
			return (
				LazyURI as unknown as { parse: (s: string) => UriObject }
			).parse(Raw);
		} catch {
			// LazyURI unavailable or parse error - fall back to a stub so
			// the folder is not silently dropped from the workspace list.
			return MakeUriStub(Raw);
		}
	}
	// Already a URI-shaped object - check for the critical getters extensions
	// rely on (`fsPath`, `toString`). If present, use as-is; otherwise try to
	// reparse via `toString()`.
	if (
		typeof Raw.toString === "function" &&
		typeof (Raw as UriObject).fsPath === "string"
	)
		return Raw;
	try {
		const RawStr =
			Raw.toString !== Object.prototype.toString
				? Raw.toString()
				: (Raw as any).scheme && (Raw as any).path
					? `${(Raw as any).scheme}://${(Raw as any).authority ?? ""}${(Raw as any).path}`
					: null;
		if (!RawStr) return null;
		return (
			LazyURI as unknown as { parse: (s: string) => UriObject }
		).parse(RawStr);
	} catch {
		const FallbackStr =
			Raw.toString !== Object.prototype.toString
				? Raw.toString()
				: (Raw as any).scheme && (Raw as any).path
					? `${(Raw as any).scheme}://${(Raw as any).authority ?? ""}${(Raw as any).path}`
					: null;
		return FallbackStr ? MakeUriStub(FallbackStr) : null;
	}
};

// Register once at module load so any sync throw inside a listener chain
// cannot nuke the extension host.
if (
	!(process as { _landUncaughtHandlerInstalled?: boolean })
		._landUncaughtHandlerInstalled
) {
	process.on("uncaughtException", (Error) => {
		try {
			const Stack =
				Error instanceof globalThis.Error
					? Error.stack?.split("\n").slice(0, 6).join(" | ")
					: String(Error);
			process.stdout.write(
				`[LandFix:UncaughtException] ${Stack ?? "unknown"}\n`,
			);
		} catch {}
	});
	process.on("unhandledRejection", (Reason) => {
		try {
			const Stack =
				Reason instanceof globalThis.Error
					? Reason.stack?.split("\n").slice(0, 6).join(" | ")
					: String(Reason);
			// Benign first-boot probes: extensions read state files that
			// don't exist on a fresh profile (vim's `.registers`, gitlens
			// launchpad cache, copilot session state). The
			// `[LandFix:UnhandledRejection]` log is intended for *real*
			// crashes - downgrade per-extension lazy-creation ENOENTs +
			// known extension-internal type errors to
			// `landfix-rejection-verbose` so `Trace=short` runs
			// only surface unexpected rejections.
			const Text = Stack ?? "unknown";
			const IsBenignEnoent =
				Text.includes("ENOENT") &&
				(Text.includes("/.registers") ||
					Text.includes("/globalStorage/") ||
					Text.includes("/workspaceStorage/") ||
					Text.includes("/User/snippets") ||
					Text.includes("/User/prompts") ||
					Text.includes("/User/keybindings.json") ||
					Text.includes("aiGeneratedWorkspaces.json") ||
					Text.includes("languageDetectionWorkerCache.json"));
			// Extension-internal bugs: an extension's own code throws a
			// TypeError whose stack lives entirely under
			// `~/.fiddee/extensions/<extId>/` or
			// `Dependency/.../extensions/<extId>/`. These are NOT Land
			// bugs - the extension would throw on stock VS Code too,
			// it's just visible because Cocoon catches every rejection.
			// Common observed patterns:
			//   - DEVSENSE.phptools-vscode: `Cannot read properties of
			//     null (reading 'filter')` during php-tools state init.
			//   - redhat.java: `Cannot set properties of undefined
			//     (setting 'outputPath')` during java config write.
			//   - GitHub.copilot: occasional null-deref on session
			//     replay.
			// Pattern-match on the stack trace's `extensions/<vendor>.<ext>`
			// segment so the filter survives extension version bumps.
			const HasExtensionFrame =
				Text.includes("/.fiddee/extensions/") ||
				Text.includes("/.land/extensions/") ||
				(Text.includes("/extensions/") &&
					(Text.includes("DEVSENSE.phptools") ||
						Text.includes("redhat.java") ||
						Text.includes("redhat.vscode-yaml") ||
						Text.includes("GitHub.copilot") ||
						Text.includes("Anthropic.claude-code") ||
						Text.includes("RooVeterinaryInc.roo-cline") ||
						Text.includes("eamodio.gitlens") ||
						Text.includes("vscodevim.vim") ||
						Text.includes("Dart-Code.dart-code")));
			const IsBenignExtensionTypeError =
				HasExtensionFrame &&
				(Text.includes("TypeError: Cannot read properties of null") ||
					Text.includes(
						"TypeError: Cannot read properties of undefined",
					) ||
					Text.includes("TypeError: Cannot set properties of null") ||
					Text.includes(
						"TypeError: Cannot set properties of undefined",
					) ||
					Text.includes("is not a function") ||
					Text.includes("is not iterable"));
			const IsBenign = IsBenignEnoent || IsBenignExtensionTypeError;
			const Tag = IsBenign
				? "LandFix:UnhandledRejection:Verbose"
				: "LandFix:UnhandledRejection";
			if (
				IsBenign &&
				!process.env["Trace"]?.includes("landfix-rejection-verbose")
			) {
				return;
			}
			process.stdout.write(`[${Tag}] ${Text}\n`);
		} catch {}
	});
	(
		process as { _landUncaughtHandlerInstalled?: boolean }
	)._landUncaughtHandlerInstalled = true;
	try {
		process.stdout.write(
			"[LandFix:UncaughtHandlers] uncaughtException + unhandledRejection handlers installed at NotificationHandler module load\n",
		);
	} catch {}
}

/**
 * Apply a `$deltaWorkspaceFolders` payload to the cached InitWorkspace snapshot
 * so subsequent synchronous reads of `vscode.workspace.workspaceFolders`
 * reflect the mutation. `Context.ExtensionHostInitData.workspace.folders` is
 * the list the WorkspaceNamespace shim captures at construction time; mutating
 * it in place preserves the reference so extensions that cached the array at
 * activation still observe the new folders.
 *
 * Returns the final merged folder list for downstream consumers (e.g. the
 * workspaceContains re-activation scan in BATCH-15).
 */
const ApplyWorkspaceDelta = (
	Context: HandlerContext,
	Payload: WorkspaceDeltaPayload,
): WorkspaceFolderWire[] => {
	const Added = Payload?.added ?? [];
	const Removed = Payload?.removed ?? [];
	const RemovedUris = new Set<string>(
		Removed.map((Folder) => Folder?.uri ?? "").filter(
			(Uri) => Uri.length > 0,
		),
	);

	const Init = (Context.ExtensionHostInitData ??= {});
	const Workspace = (Init.workspace ??= Init.workspaceData ?? {});
	const Existing: WorkspaceFolderWire[] = Array.isArray(Workspace.folders)
		? (Workspace.folders as WorkspaceFolderWire[])
		: [];

	const Kept = Existing.filter(
		(Folder) => !RemovedUris.has(Folder?.uri ?? ""),
	);
	const ExistingUris = new Set<string>(
		Kept.map((Folder) => Folder?.uri ?? "").filter((Uri) => Uri.length > 0),
	);
	for (const Candidate of Added) {
		const Uri = Candidate?.uri ?? "";
		if (Uri.length === 0 || ExistingUris.has(Uri)) continue;
		Kept.push(Candidate);
		ExistingUris.add(Uri);
	}
	// Re-index so the exposed list stays VS Code-compatible.
	for (let Index = 0; Index < Kept.length; Index += 1) {
		Kept[Index] = { ...Kept[Index], index: Index };
	}
	Workspace.folders = Kept;
	// Workspace.workspaceData mirror for consumers that read the alternate
	// shape - keep them in sync so no extension reads stale state.
	Init.workspaceData = Workspace;
	// `workspace.name` is derived from the first folder when the workspace has
	// not been explicitly named. Refresh it so it survives open/close cycles.
	if (typeof Workspace.name !== "string" || Workspace.name.length === 0) {
		const First = Kept[0];
		if (First?.name) Workspace.name = First.name;
	}
	return Kept;
};

/**
 * Invoke every listener for `Event` individually, isolating each from the
 * others with try/catch. Node's default `emitter.emit()` calls listeners
 * synchronously in registration order and rethrows the first one that
 * throws - which skips every subsequent listener AND propagates the
 * error up, crashing the extension host when an extension's listener
 * has an uncaught bug.
 *
 * Atom I2 (2026-04-21): the built-in `gulp` extension's
 * `TaskDetector.updateWorkspaceFolders` throws
 * `ERR_INVALID_ARG_TYPE` (`path.join(undefined, …)`) whenever the
 * workspace transitions from empty to one-folder. Without SafeEmit,
 * that kills Cocoon with exit code 1 - every extension dies, and the
 * whole post-folder-open experience silently breaks.
 *
 * We cannot patch `extensions/gulp/out/main.js` (VS Code source) so the
 * isolation has to live at the emitter level. Per-listener try/catch is
 * the minimum change that preserves ordering and lets subsequent
 * listeners run when an upstream one throws.
 */
const SafeEmit = (
	Source: EventEmitter | undefined,
	Event: string,
	Payload: unknown,
): void => {
	if (!Source) return;
	const Listeners = Source.listeners(Event);
	if (Listeners.length === 0) return;
	for (const Listener of Listeners) {
		try {
			(Listener as (..._Args: unknown[]) => void)(Payload);
		} catch (Caught) {
			const Err = Caught as { message?: string; stack?: string };
			const Summary =
				typeof Err?.stack === "string"
					? Err.stack.split("\n").slice(0, 3).join(" | ")
					: typeof Err?.message === "string"
						? Err.message
						: String(Caught);
			try {
				process.stdout.write(
					`[LandFix:SafeEmit] listener for "${Event}" threw: ${Summary}\n`,
				);
			} catch {}
		}
	}
};

/**
 * Handle specific notification types by routing to domain handlers.
 * DocumentContentHandler methods are passed directly to avoid circular imports.
 * WorkspaceEventEmitter is forwarded to document handlers for event emission.
 */
const HandleSpecificNotification = (
	Emitter: EventEmitter,
	DocumentContentCache: Map<string, string>,
	HandleDocumentChange: (
		Cache: Map<string, string>,
		Parameters: any,
		WorkspaceEventEmitter?: EventEmitter,
	) => void,
	HandleDocumentOpen: (
		Cache: Map<string, string>,
		Parameters: any,
		WorkspaceEventEmitter?: EventEmitter,
	) => void,
	HandleDocumentClose: (
		Cache: Map<string, string>,
		Parameters: any,
		WorkspaceEventEmitter?: EventEmitter,
	) => void,
	HandleDocumentSave: (
		Cache: Map<string, string>,
		Parameters: any,
		WorkspaceEventEmitter?: EventEmitter,
	) => void,
	Method: string,
	Parameters: any,
	WorkspaceEventEmitter?: EventEmitter,
	Context?: HandlerContext,
): void => {
	switch (Method) {
		case "extension.change":
			Emitter.emit("extensionChanged", Parameters);
			break;
		case "configuration.change":
			Emitter.emit("configurationChanged", Parameters);
			break;
		case "window.focused":
			Emitter.emit("windowFocused", Parameters);
			if (Context) {
				(Context as any).__windowState = {
					focused: true,
					active: true,
				};
				Emitter.emit("window.didChangeWindowState", {
					focused: true,
					active: true,
				});
			}
			break;
		case "window.blurred":
			Emitter.emit("windowBlurred", Parameters);
			if (Context) {
				(Context as any).__windowState = {
					focused: false,
					active: false,
				};
				Emitter.emit("window.didChangeWindowState", {
					focused: false,
					active: false,
				});
			}
			break;
		case "system.shutdown":
			Emitter.emit("systemShutdown", Parameters);
			break;
		case "$acceptModelChanged":
		case "document.didChange":
			HandleDocumentChange(
				DocumentContentCache,
				Parameters,
				WorkspaceEventEmitter,
			);
			break;
		case "$acceptModelAdded":
		case "$acceptModelOpen":
		case "document.didOpen":
			HandleDocumentOpen(
				DocumentContentCache,
				Parameters,
				WorkspaceEventEmitter,
			);
			// Populate `workspace.textDocuments` - the global flat list of all
			// open documents that extensions iterate with `workspace.textDocuments`.
			// Previously always an empty array; now reflects the real open set.
			if (Context) {
				const OpenModels = Array.isArray(Parameters)
					? Parameters
					: [Parameters];
				const TextDocs = (Context as any).__textDocuments ?? [];
				for (const Model of OpenModels) {
					const Uri =
						Model?.Uri ?? Model?.uri ?? Model?.fileName ?? "";
					if (!Uri) continue;
					const LangId =
						Model?.LanguageIdentifier ??
						Model?.languageId ??
						"plaintext";
					const Existing = TextDocs.find(
						(D: any) =>
							D?.uri?.toString?.() === Uri || D?.fileName === Uri,
					);
					if (!Existing) {
						const DocUri = {
							toString: () => Uri,
							fsPath: Uri.replace(/^file:\/\//, ""),
							scheme: Uri.includes(":")
								? Uri.split(":")[0]
								: "file",
							path: Uri.replace(/^file:\/\//, ""),
							external: Uri,
						};
						TextDocs.push({
							uri: DocUri,
							fileName: Uri.replace(/^file:\/\//, ""),
							languageId: LangId,
							version: Model?.VersionId ?? Model?.version ?? 1,
							isDirty: false,
							isClosed: false,
							isUntitled: Uri.startsWith("untitled:"),
							eol: 1,
							get lineCount() {
								return (
									DocumentContentCache.get(Uri) ?? ""
								).split(/\r?\n/).length;
							},
							getText: (Range?: any) => {
								const Text =
									DocumentContentCache.get(Uri) ?? "";
								if (!Range) return Text;
								const Lines = Text.split(/\r?\n/);
								const SL = Range?.start?.line ?? 0;
								const SC = Range?.start?.character ?? 0;
								const EL = Range?.end?.line ?? Lines.length - 1;
								const EC =
									Range?.end?.character ??
									Lines[EL]?.length ??
									0;
								if (SL === EL)
									return (Lines[SL] ?? "").slice(SC, EC);
								const Parts = [(Lines[SL] ?? "").slice(SC)];
								for (let I = SL + 1; I < EL; I++)
									Parts.push(Lines[I] ?? "");
								Parts.push((Lines[EL] ?? "").slice(0, EC));
								return Parts.join("\n");
							},
							lineAt: (N: any) => {
								const Text =
									DocumentContentCache.get(Uri) ?? "";
								const Lines = Text.split(/\r?\n/);
								const Ln =
									typeof N === "number" ? N : (N?.line ?? 0);
								const Clamped = Math.max(
									0,
									Math.min(Ln, Lines.length - 1),
								);
								const T = Lines[Clamped] ?? "";
								const FNW = T.search(/\S/);
								return {
									text: T,
									lineNumber: Clamped,
									range: {
										start: { line: Clamped, character: 0 },
										end: {
											line: Clamped,
											character: T.length,
										},
									},
									firstNonWhitespaceCharacterIndex:
										FNW < 0 ? T.length : FNW,
									isEmptyOrWhitespace: T.trim().length === 0,
								};
							},
							save: async () => false,
							getWordRangeAtPosition: (
								Pos: any,
								Pat?: RegExp,
							) => {
								const Text =
									DocumentContentCache.get(Uri) ?? "";
								const Lines = Text.split(/\r?\n/);
								const L = Lines[Pos?.line ?? 0] ?? "";
								const R = Pat ?? /\w+/g;
								R.lastIndex = 0;
								const C = Pos?.character ?? 0;
								let M: RegExpExecArray | null;
								while ((M = R.exec(L)) !== null) {
									if (
										M.index <= C &&
										M.index + M[0].length >= C
									)
										return {
											start: {
												line: Pos?.line ?? 0,
												character: M.index,
											},
											end: {
												line: Pos?.line ?? 0,
												character:
													M.index + M[0].length,
											},
										};
								}
								return undefined;
							},
							validateRange: (R: any) => R,
							validatePosition: (P: any) => P,
							offsetAt: (P: any) => {
								const Text =
									DocumentContentCache.get(Uri) ?? "";
								const Lines = Text.split(/\r?\n/);
								let O = 0;
								for (
									let I = 0;
									I < (P?.line ?? 0) && I < Lines.length;
									I++
								)
									O += (Lines[I]?.length ?? 0) + 1;
								return O + (P?.character ?? 0);
							},
							positionAt: (Off: number) => {
								const Text =
									DocumentContentCache.get(Uri) ?? "";
								const Lines = Text.split(/\r?\n/);
								let R = Off;
								for (let I = 0; I < Lines.length; I++) {
									const L = (Lines[I]?.length ?? 0) + 1;
									if (R < L) return { line: I, character: R };
									R -= L;
								}
								return {
									line: Lines.length - 1,
									character:
										Lines[Lines.length - 1]?.length ?? 0,
								};
							},
						});
					}
				}
				(Context as any).__textDocuments = TextDocs;
			}
			// BATCH-15 step 5: fire `onLanguage:<id>` activation for any
			// extension that declares interest in the freshly-opened file's
			// language. Lazy-load the activator so NotificationHandler
			// module-init stays side-effect-free.
			if (Context) {
				const CapturedContext = Context;
				const Models = Array.isArray(Parameters)
					? Parameters
					: [Parameters];
				const LanguageIdentifiers = new Set<string>();
				for (const Model of Models) {
					const Id: string | undefined =
						Model?.LanguageIdentifier ??
						Model?.languageId ??
						Model?.language;
					if (typeof Id === "string" && Id.length > 0) {
						LanguageIdentifiers.add(Id);
					}
				}
				if (LanguageIdentifiers.size > 0) {
					setImmediate(() => {
						import("../Extension/Host/Handler.js")
							.then(({ default: ExtensionHostHandler }) => {
								for (const Id of LanguageIdentifiers) {
									void ExtensionHostHandler.HandleActivateByEvent(
										CapturedContext,
										{ activationEvent: `onLanguage:${Id}` },
									).catch((Error) => {
										try {
											process.stdout.write(
												`[LandFix:Activator] onLanguage:${Id} activation failed: ${Error instanceof globalThis.Error ? Error.message : String(Error)}\n`,
											);
										} catch {}
									});
								}
							})
							.catch(() => {});
					});
				}
			}
			break;
		case "$acceptModelRemoved":
		case "$acceptModelClosed":
		case "document.didClose":
			HandleDocumentClose(
				DocumentContentCache,
				Parameters,
				WorkspaceEventEmitter,
			);
			// Remove from workspace.textDocuments
			if (Context) {
				const CloseModels = Array.isArray(Parameters)
					? Parameters
					: [Parameters];
				const ClosedUris = new Set(
					CloseModels.map(
						(M: any) => M?.uri ?? M?.Uri ?? M?.fileName ?? "",
					).filter(Boolean),
				);
				const Docs = (Context as any).__textDocuments ?? [];
				(Context as any).__textDocuments = Docs.filter((D: any) => {
					const DUri = D?.uri?.toString?.() ?? D?.fileName ?? "";
					return !ClosedUris.has(DUri);
				});
				// Also remove from visibleTextEditors so the array stays
				// in sync with what's actually open in the workbench.
				const Visible: unknown[] =
					(Context as any).__visibleTextEditors ?? [];
				(Context as any).__visibleTextEditors = Visible.filter(
					(E: unknown) => {
						const EUri =
							(E as any)?.document?.uri?.toString?.() ?? "";
						return !ClosedUris.has(EUri);
					},
				);
			}
			break;
		// `document.willSave` - Mountain fires this BEFORE the file is persisted
		// (from `Workspace.Save` Track effect). Extensions subscribe via
		// `workspace.onWillSaveTextDocument` to apply last-minute edits.
		// We run all registered save listeners and collect any TextEdits they
		// return, then forward the collected edits back to Mountain as
		// `window.applyTextEdits` so they are applied before disk-write.
		case "document.willSave":
		case "$acceptWillSaveDocument": {
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			const Uri = Payload?.uri ?? Payload?.Uri ?? "";
			const Reason = Payload?.reason ?? Payload?.Reason ?? 1; // 1=Manual
			const Listeners: ((...A: any[]) => any)[] =
				(Context as any).__willSaveListeners ?? [];
			if (Listeners.length > 0 && Uri) {
				const Doc = {
					uri: {
						toString: () => Uri,
						fsPath: Uri.replace(/^file:\/\//, ""),
						scheme: "file",
					},
					fileName: Uri.replace(/^file:\/\//, ""),
					languageId: "plaintext",
					version: 1,
					isDirty: true,
					isClosed: false,
					isUntitled: false,
					getText: () => DocumentContentCache.get(Uri) ?? "",
					save: async () => true,
				};
				const WillSaveThenables: Promise<any>[] = [];
				const Event = {
					document: Doc,
					reason: Reason,
					// Collect thenables so we can await them all before
					// forwarding edits to Mountain. This ensures all
					// `waitUntil(promise)` calls in the same save cycle
					// complete before any edit is applied, matching VS Code's
					// `ExtHostDocuments.$acceptWillSaveDocument` ordering.
					waitUntil: (Thenable: Promise<any>) => {
						WillSaveThenables.push(
							Promise.resolve(Thenable).catch(() => undefined),
						);
					},
				};
				for (const Listener of Listeners) {
					try {
						Listener(Event);
					} catch {
						/* never block save */
					}
				}
				// Await all thenables, then batch any returned TextEdits back
				// to Mountain in one `window.applyTextEdits` call per URI.
				if (WillSaveThenables.length > 0 && Uri) {
					Promise.allSettled(WillSaveThenables).then((Results) => {
						const AllEdits: unknown[] = [];
						for (const R of Results) {
							if (
								R.status === "fulfilled" &&
								Array.isArray(R.value) &&
								R.value.length > 0
							) {
								AllEdits.push(...R.value);
							}
						}
						if (AllEdits.length > 0) {
							Context?.SendToMountain("window.applyTextEdits", {
								uri: Uri,
								edits: AllEdits,
							}).catch(() => {});
						}
					});
				}
			}
			SafeEmit(WorkspaceEventEmitter, "willSaveTextDocument", {
				uri: Uri,
				reason: Reason,
			});
			break;
		}

		case "$acceptModelSaved":
		case "document.didSave":
			HandleDocumentSave(
				DocumentContentCache,
				Parameters,
				WorkspaceEventEmitter,
			);
			break;
		case "webview.message": {
			// { handle, message } - the webview posted a message to the extension.
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			if (Payload?.handle) {
				Emitter.emit(
					`webview.message:${Payload.handle}`,
					Payload.message,
				);
			}
			break;
		}
		case "webview.dispose": {
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			if (Payload?.handle) {
				Emitter.emit(`webview.dispose:${Payload.handle}`);
				// Webview-view branch: dispose the per-handle proxy
				// view so its onDispose listeners fire on the
				// extension side. Builders entry stays in case the
				// view is later re-resolved (workbench may show the
				// panel again).
				try {
					import("../VscodeAPI/Window/Namespace.js").then(
						({ WebviewViewBuilders: _Builders }) => {
							/* builders are factories - no per-instance state to dispose here */
						},
					);
				} catch (_e) {
					/* swallow */
				}
			}
			break;
		}
		case "webview.viewState": {
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			if (Payload?.handle) {
				Emitter.emit(`webview.viewState:${Payload.handle}`, {
					active: Payload.active,
					visible: Payload.visible,
					viewColumn: Payload.viewColumn,
				});
				// Webview-view onDidChangeVisibility forward. The most
				// recent proxy view for this handle stored its
				// `_FireVisibility` hook on a per-resolve closure; we
				// drop the visible flag onto the channel above so any
				// proxy that subscribed via `view.onDidChangeVisibility(
				// listener)` receives it through the same Emitter
				// channel. Per-resolve subscriptions live on the proxy
				// itself and are reaped when the next resolve runs.
				Emitter.emit(
					`webview.viewVisibility:${Payload.handle}`,
					!!Payload.visible,
				);
			}
			break;
		}
		case "$deltaWorkspaceFolders": {
			// Mountain fires this whenever the workspace folder set mutates
			// (boot seed, user-pick, Tauri command, Cocoon-driven update).
			// Refresh the cached InitWorkspace snapshot first so synchronous
			// reads see fresh data, then emit didChangeWorkspaceFolders so
			// extensions that subscribed via vscode.workspace fire their
			// listeners. BATCH-15 hooks the activation scan off the same
			// event on WorkspaceEventEmitter.
			const Payload = (
				Array.isArray(Parameters) ? Parameters[0] : Parameters
			) as WorkspaceDeltaPayload | undefined;
			const Added = Payload?.added ?? [];
			const Removed = Payload?.removed ?? [];
			let Merged: WorkspaceFolderWire[] = [];
			if (Context) {
				Merged = ApplyWorkspaceDelta(Context, Payload ?? {});
			}
			try {
				process.stdout.write(
					`[LandFix:WsDelta] $deltaWorkspaceFolders +${Added.length} -${Removed.length} → folders=${Merged.length}\n`,
				);
			} catch {}
			// Atom I3 (root-cause fix): hydrate wire URIs into real
			// `vscode.Uri` objects before emitting. Built-in extensions
			// (gulp, task-detectors, lint providers, …) call
			// `folder.uri.fsPath`, `folder.uri.toString()`, `URI.revive`
			// etc. on the folder payload. Raw wire `{uri: "file://…"}`
			// strings don't carry those getters, so `add.uri.fsPath` is
			// undefined and downstream `path.join(undefined)` explodes.
			//
			// Each hydrated entry matches vscode.WorkspaceFolder shape:
			//   { uri: Uri, name: string, index: number }
			const HydrateFolder = (
				Wire: WorkspaceFolderWire,
				Index: number,
			): {
				uri: UriObject;
				name: string;
				index: number;
			} | null => {
				const Uri = HydrateUri(Wire.uri);
				if (!Uri) return null;
				return {
					uri: Uri,
					name: Wire.name ?? Uri.fsPath.split("/").pop() ?? "",
					index: typeof Wire.index === "number" ? Wire.index : Index,
				};
			};
			const AddedHydrated = Added.map((W, I) =>
				HydrateFolder(W, I),
			).filter((V): V is Exclude<typeof V, null> => V !== null);
			const RemovedHydrated = Removed.map((W, I) =>
				HydrateFolder(W, I),
			).filter((V): V is Exclude<typeof V, null> => V !== null);
			const MergedHydrated = Merged.map((W, I) =>
				HydrateFolder(W, I),
			).filter((V): V is Exclude<typeof V, null> => V !== null);
			try {
				process.stdout.write(
					`[LandFix:WsDelta] hydrated +${AddedHydrated.length}/${Added.length} -${RemovedHydrated.length}/${Removed.length} folders=${MergedHydrated.length}/${Merged.length}\n`,
				);
			} catch {}

			// Atom I2 (retained): SafeEmit isolates each listener's
			// throws so one buggy extension still can't crash the host.
			const Event = {
				added: AddedHydrated,
				removed: RemovedHydrated,
				folders: MergedHydrated,
			};
			SafeEmit(WorkspaceEventEmitter, "didChangeWorkspaceFolders", Event);
			// Also emit on the generic Emitter so non-workspace listeners
			// (e.g. BATCH-15's activator) can subscribe in one place.
			SafeEmit(Emitter, "workspaceFoldersChanged", Event);
			// BATCH-15: run the workspaceContains activation pass. Lazy-load to
			// avoid a circular import with the handler suite at module init.
			if (Context && Added.length > 0) {
				const CapturedContext = Context;
				setImmediate(() => {
					import("../Workspace/Contains/Activator.js")
						.then(({ default: Activate }) =>
							Activate(CapturedContext, Added),
						)
						.catch((Error) => {
							try {
								process.stdout.write(
									`[LandFix:Activator] activation pass failed: ${Error instanceof Error ? Error.message : String(Error)}\n`,
								);
							} catch {}
						});
				});
			}
			break;
		}
		case "window.didChangeActiveTextEditor": {
			// Mountain fires this when a document is opened or focused.
			// Payload: { uri, languageId, version? } or just a URI string.
			// Build a minimal TextEditor stub and emit so extensions that
			// subscribe to `vscode.window.onDidChangeActiveTextEditor` fire.
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			const UriRaw: string | undefined =
				typeof Payload === "string"
					? Payload
					: (Payload?.uri ??
						Payload?.document?.uri ??
						Payload?.document);
			const DeriveLang = (UriStr: string | undefined): string => {
				if (!UriStr) return "plaintext";
				const Ext =
					(UriStr.split(".").pop() ?? "")
						.toLowerCase()
						.split("?")[0] ?? "";
				const Map: Record<string, string> = {
					rs: "rust",
					ts: "typescript",
					tsx: "typescriptreact",
					js: "javascript",
					jsx: "javascriptreact",
					mjs: "javascript",
					json: "json",
					jsonc: "jsonc",
					json5: "json5",
					py: "python",
					go: "go",
					rb: "ruby",
					java: "java",
					c: "c",
					cpp: "cpp",
					cs: "csharp",
					h: "c",
					hpp: "cpp",
					html: "html",
					css: "css",
					scss: "scss",
					less: "less",
					md: "markdown",
					mdx: "mdx",
					txt: "plaintext",
					toml: "toml",
					yaml: "yaml",
					yml: "yaml",
					xml: "xml",
					sh: "shellscript",
					bash: "shellscript",
					zsh: "shellscript",
					fish: "fish",
					ps1: "powershell",
					php: "php",
					sql: "sql",
					kt: "kotlin",
					swift: "swift",
					r: "r",
					dart: "dart",
					lua: "lua",
					vim: "viml",
					vue: "vue",
					svelte: "svelte",
					astro: "astro",
					graphql: "graphql",
					proto: "proto",
				};
				return Map[Ext] ?? "plaintext";
			};
			const LanguageId: string =
				Payload?.languageId ?? Payload?.language ?? DeriveLang(UriRaw);
			const HydratedUri = UriRaw ? HydrateUri(UriRaw) : null;
			// Update `vscode.window.activeTextEditor`. Extensions read this
			// synchronously; mutating the shim's `__activeTextEditor` makes
			// it observable without a restart. The stub now includes a real
			// `setDecorations`, `edit`, and `selection` so language extensions
			// (Error Lens, GitLens, formatters) can call them immediately.
			const DocCached = UriRaw
				? Context?.DocumentContentCache?.get(UriRaw)
				: undefined;
			const DocText = DocCached ?? "";
			const DocLines = DocText.split(/\r?\n/);
			const MakeDoc = (RealText: string) => {
				const Lines = RealText.split(/\r?\n/);
				return {
					uri: HydratedUri,
					fileName: HydratedUri?.fsPath ?? UriRaw ?? "",
					languageId: LanguageId,
					version: Payload?.version ?? 1,
					isDirty: false,
					isClosed: false,
					eol: 1,
					get lineCount() {
						return Lines.length;
					},
					getText: (Range?: any) => {
						if (!Range) return RealText;
						const SL = Range?.start?.line ?? 0;
						const SC = Range?.start?.character ?? 0;
						const EL = Range?.end?.line ?? Lines.length - 1;
						const EC =
							Range?.end?.character ?? Lines[EL]?.length ?? 0;
						if (SL === EL) return (Lines[SL] ?? "").slice(SC, EC);
						const Parts = [(Lines[SL] ?? "").slice(SC)];
						for (let I = SL + 1; I < EL; I++)
							Parts.push(Lines[I] ?? "");
						Parts.push((Lines[EL] ?? "").slice(0, EC));
						return Parts.join("\n");
					},
					lineAt: (LineOrPos: number | { line: number }) => {
						const N =
							typeof LineOrPos === "number"
								? LineOrPos
								: LineOrPos.line;
						const T = Lines[N] ?? "";
						const FNW = T.search(/\S/);
						return {
							text: T,
							lineNumber: N,
							range: {
								start: { line: N, character: 0 },
								end: { line: N, character: T.length },
							},
							firstNonWhitespaceCharacterIndex:
								FNW === -1 ? T.length : FNW,
							isEmptyOrWhitespace: T.trim().length === 0,
						};
					},
					save: async () => false,
					getWordRangeAtPosition: (Pos: any, Pat?: RegExp) => {
						const L = Lines[Pos?.line ?? 0] ?? "";
						const R = Pat ?? /\w+/g;
						R.lastIndex = 0;
						const C = Pos?.character ?? 0;
						let M: RegExpExecArray | null;
						while ((M = R.exec(L)) !== null) {
							if (M.index <= C && M.index + M[0].length >= C)
								return {
									start: {
										line: Pos.line,
										character: M.index,
									},
									end: {
										line: Pos.line,
										character: M.index + M[0].length,
									},
								};
						}
						return undefined;
					},
					validateRange: (Rng: any) => Rng,
					validatePosition: (P: any) => P,
					offsetAt: (P: any) => {
						let O = 0;
						for (
							let I = 0;
							I < (P?.line ?? 0) && I < Lines.length;
							I++
						)
							O += (Lines[I]?.length ?? 0) + 1;
						return O + (P?.character ?? 0);
					},
					positionAt: (Off: number) => {
						let R = Off;
						for (let I = 0; I < Lines.length; I++) {
							const L = (Lines[I]?.length ?? 0) + 1;
							if (R < L) return { line: I, character: R };
							R -= L;
						}
						return {
							line: Lines.length - 1,
							character: Lines[Lines.length - 1]?.length ?? 0,
						};
					},
				};
			};
			// Build a live selection reference that Sky can update via sky:editor:selectionChanged
			const LiveSelection: any = {
				start: { line: 0, character: 0 },
				end: { line: 0, character: 0 },
				active: { line: 0, character: 0 },
				anchor: { line: 0, character: 0 },
				isEmpty: true,
				isReversed: false,
				isSingleLine: true,
			};
			const TextEditorStub = HydratedUri
				? {
						document: MakeDoc(DocText),
						get selection() {
							return LiveSelection;
						},
						set selection(S: any) {
							Object.assign(LiveSelection, S);
						},
						selections: [LiveSelection],
						visibleRanges: [],
						viewColumn: Payload?.viewColumn ?? 1,
						options: {
							tabSize: 4,
							insertSpaces: true,
							cursorStyle: 1,
							lineNumbers: 1,
						},
						// `editor.setDecorations(type, ranges)` - send to Mountain for Sky relay
						setDecorations: (
							DecorationType: any,
							RangesOrOptions: any[],
						) => {
							const Key =
								typeof DecorationType === "string"
									? DecorationType
									: (DecorationType?.key ??
										DecorationType?.id ??
										String(DecorationType));
							Context.SendToMountain(
								"window.setTextEditorDecorations",
								{
									decorationTypeKey: Key,
									uri: UriRaw,
									rangesOrOptions: RangesOrOptions,
								},
							).catch(() => {});
						},
						// `editor.edit(editBuilder => {...})` - collect edits and send to Mountain
						edit: (
							Callback: (Builder: any) => void,
							_Options?: any,
						): Promise<boolean> => {
							const Collected: any[] = [];
							const Builder = {
								replace: (Range: any, Value: string) =>
									Collected.push({
										range: Range,
										text: Value,
									}),
								insert: (Position: any, Value: string) =>
									Collected.push({
										range: {
											startLineNumber:
												(Position?.line ?? 0) + 1,
											startColumn:
												(Position?.character ?? 0) + 1,
											endLineNumber:
												(Position?.line ?? 0) + 1,
											endColumn:
												(Position?.character ?? 0) + 1,
										},
										text: Value,
									}),
								delete: (Range: any) =>
									Collected.push({ range: Range, text: "" }),
								setEndOfLine: () => {},
							};
							try {
								Callback(Builder);
							} catch {
								return Promise.resolve(false);
							}
							if (!Collected.length) return Promise.resolve(true);
							return Context.SendToMountain(
								"window.applyTextEdits",
								{ uri: UriRaw, edits: Collected },
							)
								.then(() => true)
								.catch(() => false);
						},
						// `editor.insertSnippet` - convert to plain-text edit for now
						insertSnippet: async (
							Snippet: any,
							Location?: any,
						): Promise<boolean> => {
							const Text =
								typeof Snippet === "string"
									? Snippet
									: typeof Snippet?.value === "string"
										? Snippet.value
										: String(Snippet);
							const Range = Location ?? LiveSelection;
							await Context.SendToMountain(
								"window.applyTextEdits",
								{
									uri: UriRaw,
									edits: [{ range: Range, text: Text }],
								},
							).catch(() => {});
							return true;
						},
						revealRange: (Range: any, RevealType?: number) => {
							// Use sendRequest (Track effect) not SendToMountain (notification)
							// since Mountain routes `window.revealRange` via the request path.
							void Context?.MountainClient?.sendRequest(
								"window.revealRange",
								{
									uri: UriRaw,
									range: Range,
									revealType: RevealType ?? 0,
								},
							).catch(() => {});
						},
						show: (ViewColumn?: number) => {
							// Use sendRequest for showTextDocument round-trip.
							void Context?.MountainClient?.sendRequest(
								"showTextDocument",
								[
									{
										uri: UriRaw,
										viewColumn: ViewColumn ?? 1,
									},
									ViewColumn ?? 1,
								],
							).catch(() => {});
						},
						hide: () => {},
					}
				: undefined;
			if (Context) {
				// Patch live activeTextEditor + keep the LiveSelection mutable
				// so `window.didChangeTextEditorSelection` can update it in-place.
				(Context as any).__activeTextEditor = TextEditorStub;
				(Context as any).__activeTextEditorSelection = LiveSelection;
				// Upsert into visibleTextEditors so extensions iterating all
				// open editors (GitLens, Error Lens, formatters) see current state.
				const Visible: unknown[] = Array.isArray(
					(Context as any).__visibleTextEditors,
				)
					? (Context as any).__visibleTextEditors
					: [];
				const UriKey =
					TextEditorStub?.document?.uri?.toString?.() ?? "";
				const Idx = UriKey
					? Visible.findIndex(
							(E: unknown) =>
								(E as any)?.document?.uri?.toString?.() ===
								UriKey,
						)
					: -1;
				if (Idx >= 0) {
					Visible[Idx] = TextEditorStub;
				} else if (TextEditorStub) {
					Visible.push(TextEditorStub);
				}
				(Context as any).__visibleTextEditors = Visible;
			}
			SafeEmit(
				Emitter,
				"window.didChangeActiveTextEditor",
				TextEditorStub,
			);
			break;
		}

		case "window.didChangeTextEditorSelection": {
			// Sky → Mountain → Cocoon: selection changed in Monaco.
			// Payload: { uri, selections: [{startLineNumber, startColumn, endLineNumber, endColumn}] }
			// Update the live `__activeTextEditorSelection` so extensions reading
			// `activeTextEditor.selection` see the current cursor position.
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			const Sels: any[] = Array.isArray(Payload?.selections)
				? Payload.selections
				: [];
			const LiveSel = (Context as any)?.__activeTextEditorSelection;
			if (LiveSel && Sels.length > 0) {
				const S = Sels[0];
				// Monaco uses 1-based; vscode.Position is 0-based
				const StartLine = Math.max(
					0,
					(S?.startLineNumber ?? S?.start?.line ?? 1) - 1,
				);
				const StartChar = Math.max(
					0,
					(S?.startColumn ?? S?.start?.character ?? 1) - 1,
				);
				const EndLine = Math.max(
					0,
					(S?.endLineNumber ?? S?.end?.line ?? 1) - 1,
				);
				const EndChar = Math.max(
					0,
					(S?.endColumn ?? S?.end?.character ?? 1) - 1,
				);
				LiveSel.start = { line: StartLine, character: StartChar };
				LiveSel.end = { line: EndLine, character: EndChar };
				LiveSel.active = { line: EndLine, character: EndChar };
				LiveSel.anchor = { line: StartLine, character: StartChar };
				LiveSel.isEmpty =
					StartLine === EndLine && StartChar === EndChar;
				LiveSel.isReversed = false;
				LiveSel.isSingleLine = StartLine === EndLine;
			}
			const StubSels = Sels.map((S: any) => ({
				start: {
					line: Math.max(0, (S?.startLineNumber ?? 1) - 1),
					character: Math.max(0, (S?.startColumn ?? 1) - 1),
				},
				end: {
					line: Math.max(0, (S?.endLineNumber ?? 1) - 1),
					character: Math.max(0, (S?.endColumn ?? 1) - 1),
				},
				active: {
					line: Math.max(0, (S?.endLineNumber ?? 1) - 1),
					character: Math.max(0, (S?.endColumn ?? 1) - 1),
				},
				anchor: {
					line: Math.max(0, (S?.startLineNumber ?? 1) - 1),
					character: Math.max(0, (S?.startColumn ?? 1) - 1),
				},
				isEmpty:
					S?.startLineNumber === S?.endLineNumber &&
					S?.startColumn === S?.endColumn,
				isReversed: false,
				isSingleLine: S?.startLineNumber === S?.endLineNumber,
			}));
			const Editor = (Context as any)?.__activeTextEditor;
			if (Editor && StubSels.length > 0) {
				Object.assign(Editor.selection ?? {}, StubSels[0]);
				(Editor as any).selections = StubSels;
			}
			SafeEmit(Emitter, "window.didChangeTextEditorSelection", {
				textEditor: Editor,
				selections: StubSels,
				kind: undefined,
			});
			break;
		}

		case "$acceptTerminalProcessData": {
			// Mountain fires this whenever a PTY emits stdout/stderr. The
			// payload is `[terminalId, data]`. Emit on Context.Emitter under
			// a terminal-scoped channel so each extension's
			// `onDidWriteTerminalData` listener gets only its own stream.
			const Payload = Array.isArray(Parameters)
				? Parameters
				: [Parameters];
			const TerminalId = Payload[0];
			const Data = Payload[1];
			if (TerminalId !== undefined) {
				Emitter.emit(`terminal:data:${TerminalId}`, Data);
			}
			Emitter.emit("terminalData", { id: TerminalId, data: Data });
			break;
		}
		case "$acceptTerminalProcessExit": {
			// Mountain fires this when a PTY shell process exits. Payload is
			// `[terminalId]`. Mirror the same pattern as data events so per-
			// terminal subscribers dispose cleanly.
			const Payload = Array.isArray(Parameters)
				? Parameters
				: [Parameters];
			const TerminalId = Payload[0];
			if (TerminalId !== undefined) {
				Emitter.emit(`terminal:exit:${TerminalId}`);
			}
			Emitter.emit("terminalExit", { id: TerminalId });
			break;
		}

		// B6: Mountain notifies Cocoon when a terminal is opened from the UI
		// (not via the extension createTerminal() API) so vscode.window.terminals
		// stays accurate.
		case "$acceptTerminalOpened": {
			const OpenPayload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			const OpenId = OpenPayload?.id ?? OpenPayload;
			const OpenName = OpenPayload?.name ?? `Terminal ${OpenId}`;
			if (Context && OpenId !== undefined) {
				if (!Array.isArray((Context as any).__terminals)) {
					(Context as any).__terminals = [];
				}
				const Already = ((Context as any).__terminals as any[]).some(
					(T: any) => T?.handle === OpenId || T?.id === OpenId,
				);
				if (!Already) {
					// Push a minimal terminal stub matching the shape from
					// Window/Namespace.ts createTerminal().
					const Stub = {
						name: OpenName,
						handle: OpenId,
						id: OpenId,
						processId: Promise.resolve(
							undefined as number | undefined,
						),
						sendText: () => {},
						show: () => {},
						hide: () => {},
						dispose: () => {},
					};
					(Context as any).__terminals.push(Stub);
					(Context as any).__activeTerminal = Stub;
					Emitter.emit("window.didOpenTerminal", Stub);
					Emitter.emit("window.didChangeActiveTerminal", Stub);
				}
			}
			break;
		}

		// B6: Mountain notifies Cocoon when a terminal closes so the stale
		// entry is removed from vscode.window.terminals.
		case "$acceptTerminalClosed": {
			const ClosePayload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			const CloseId = ClosePayload?.id ?? ClosePayload;
			if (Context && CloseId !== undefined) {
				const All = ((Context as any).__terminals as any[]) ?? [];
				const Removed = All.filter(
					(T: any) => T?.handle === CloseId || T?.id === CloseId,
				);
				(Context as any).__terminals = All.filter(
					(T: any) => T?.handle !== CloseId && T?.id !== CloseId,
				);
				if (
					(Context as any).__activeTerminal?.handle === CloseId ||
					(Context as any).__activeTerminal?.id === CloseId
				) {
					(Context as any).__activeTerminal = undefined;
					Emitter.emit("window.didChangeActiveTerminal", undefined);
				}
				for (const Term of Removed) {
					Emitter.emit("window.didCloseTerminal", Term);
				}
			}
			break;
		}

		case "$acceptActiveTerminalChanged": {
			// Mountain fires this when Sky detects the user switched the
			// active terminal tab (ITerminalService.onDidChangeActiveInstance).
			// Payload: { id: number | null }
			const ActivePayload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			const ActiveId =
				ActivePayload?.id ??
				(typeof ActivePayload === "number" ? ActivePayload : null);
			if (ActiveId === null || ActiveId === undefined) {
				(Context as any).__activeTerminal = undefined;
				Emitter.emit("window.didChangeActiveTerminal", undefined);
			} else {
				const Found = ((Context as any).__terminals ?? []).find(
					(T: any) => T?.handle === ActiveId || T?.id === ActiveId,
				);
				if (Found) {
					(Context as any).__activeTerminal = Found;
					Emitter.emit("window.didChangeActiveTerminal", Found);
				}
			}
			break;
		}

		case "$fileWatcher:event":
			// { handle, kind: "create"|"change"|"delete", path }
			{
				const Event = (
					Array.isArray(Parameters) ? Parameters[0] : Parameters
				) as
					| { handle?: string; kind?: string; path?: string }
					| undefined;
				if (Event?.handle && Event.kind && Event.path) {
					Emitter.emit(`fileWatcher:${Event.handle}`, {
						kind: Event.kind,
						path: Event.path,
					});
				}
			}
			break;
		// Debug session lifecycle. Mountain emits these via
		// `IPCProvider.SendNotificationToSideCar` from `DebugProvider.rs`
		// whenever a debug adapter starts/stops or a DAP custom event
		// arrives. The corresponding `vscode.debug.onDid*` listeners in
		// `DebugNamespace.ts` subscribe to the channels emitted below,
		// so re-emitting under the canonical short name is what makes
		// the extension-facing event fire.
		case "$onDidStartDebugSession": {
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			if (Context && Payload) {
				(Context as any).__activeDebugSession = Payload;
			}
			Emitter.emit("debug.didStartSession", Payload);
			break;
		}
		case "$onDidTerminateDebugSession": {
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			if (Context) {
				const Current = (Context as any).__activeDebugSession;
				if (Current?.id && Payload?.id && Current.id === Payload.id) {
					(Context as any).__activeDebugSession = undefined;
				}
			}
			Emitter.emit("debug.didTerminateSession", Payload);
			break;
		}
		case "$onDidChangeActiveDebugSession": {
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			if (Context) {
				(Context as any).__activeDebugSession = Payload ?? undefined;
			}
			Emitter.emit("debug.didChangeActiveSession", Payload);
			break;
		}
		case "$onDidReceiveDebugSessionCustomEvent": {
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			Emitter.emit("debug.didReceiveCustomEvent", Payload);
			break;
		}
		case "$onDidChangeBreakpoints": {
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			Emitter.emit("debug.didChangeBreakpoints", Payload);
			break;
		}
		case "$onDidChangeActiveStackItem": {
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			Emitter.emit("debug.didChangeActiveStackItem", Payload);
			break;
		}
		// Custom-editor document lifecycle. Mountain forwards each
		// workbench-side save / revert / backup request as one of the
		// `$onSave*Document` / `$onRevertCustomDocument` reverse-RPCs.
		// We re-emit on a `customEditor.*` channel so the matching
		// provider in `CustomEditorProviders` can dispatch through the
		// stored provider methods. The actual provider invocation is
		// done by `WindowNamespace`'s `handleCustomDocumentLifecycle`
		// helper which subscribes to these emitter channels.
		// `$resolveCustomEditor` is fired by the workbench when a user
		// opens a file under a registered custom-editor viewType. Mountain
		// forwards the positional payload `[ResourceUriComponents,
		// ViewType, WebviewPanelHandle]` from
		// `Track/Effect/CreateEffectForRequest/Webview.rs`. Without this
		// case, the workbench's "Open With…" dispatch silently drops every
		// custom-editor open - Jupyter notebooks, hex viewer, image
		// preview, etc. all fail to load. Look up the registered provider
		// by viewType, build a minimal `CustomDocument` shape (what the
		// provider's `resolveCustomEditor(document, webviewPanel, token)`
		// expects), and invoke. Errors are caught so a buggy provider
		// never crashes the host.
		case "$resolveCustomEditor": {
			const Args = Array.isArray(Parameters) ? Parameters : [];
			const UriComponents = Args[0] as unknown;
			const ViewType = (Args[1] as string | undefined) ?? "";
			const WebviewPanelHandle = Args[2] as unknown;
			const ProviderEntry =
				WindowNamespaceModule.CustomEditorProvidersByViewType.get(
					ViewType,
				);
			if (!ProviderEntry) {
				try {
					process.stdout.write(
						`[NotificationHandler] $resolveCustomEditor: no provider for viewType="${ViewType}"\n`,
					);
				} catch {}
				break;
			}
			const Provider = ProviderEntry.Provider as Record<string, unknown>;
			const Method = ProviderEntry.Readonly
				? "resolveCustomEditor"
				: typeof Provider["resolveCustomTextEditor"] === "function"
					? "resolveCustomTextEditor"
					: "resolveCustomEditor";
			const Resolve = Provider[Method] as
				| ((...A: unknown[]) => unknown)
				| undefined;
			if (typeof Resolve !== "function") {
				try {
					process.stdout.write(
						`[NotificationHandler] $resolveCustomEditor: provider for "${ViewType}" lacks ${Method}()\n`,
					);
				} catch {}
				break;
			}
			// Workbench-side `CustomDocument` shape: extension code reads
			// `document.uri` (a real `Uri`) and treats the rest as opaque
			// state it owns. We synthesise the minimum surface from the
			// wire payload; rich save / backup state flows through the
			// `customEditor.*` reverse-RPCs handled below.
			const Document = {
				uri: HydrateUri(UriComponents) ?? UriComponents,
				dispose: () => {},
			};
			const WebviewPanel = {
				handle: WebviewPanelHandle,
				viewType: ViewType,
				webview: {
					postMessage: () => Promise.resolve(false),
					html: "",
					options: {},
					cspSource: "vscode-webview:",
				},
				dispose: () => {},
				onDidDispose: () => ({ dispose: () => {} }),
				onDidChangeViewState: () => ({ dispose: () => {} }),
			};
			try {
				const Result = Resolve.call(Provider, Document, WebviewPanel, {
					isCancellationRequested: false,
				}) as unknown;
				if (
					Result &&
					typeof (Result as PromiseLike<unknown>).then === "function"
				) {
					(Result as PromiseLike<unknown>).then(
						() => {},
						(Error: unknown) => {
							try {
								process.stdout.write(
									`[NotificationHandler] $resolveCustomEditor: provider for "${ViewType}" rejected: ${
										Error instanceof globalThis.Error
											? Error.message
											: String(Error)
									}\n`,
								);
							} catch {}
						},
					);
				}
			} catch (Error) {
				try {
					process.stdout.write(
						`[NotificationHandler] $resolveCustomEditor: provider for "${ViewType}" threw: ${
							Error instanceof globalThis.Error
								? Error.message
								: String(Error)
						}\n`,
					);
				} catch {}
			}
			break;
		}
		case "$onSaveCustomDocument":
		case "$onSaveCustomDocumentAs":
		case "$onRevertCustomDocument":
		case "$onBackupCustomDocument":
		case "$onWillSaveCustomDocument":
		case "$onDidChangeCustomDocument": {
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			// Map Mountain's `$on…CustomDocument` reverse-RPC names to the
			// channel suffixes that `WindowNamespace.ts:198-206` subscribes
			// to. Save variants drop the `Custom` infix
			// (`$onSaveCustomDocument` → `saveDocument`); revert / backup
			// / willSave / didChange keep `Custom` because the subscriber
			// channel includes it. Keeping this as an explicit table beats
			// the previous `slice` heuristic which produced
			// `customEditor.saveCustomDocument` and silently failed every
			// listener match.
			const ChannelMap: Record<string, string> = {
				$onSaveCustomDocument: "saveDocument",
				$onSaveCustomDocumentAs: "saveDocumentAs",
				$onRevertCustomDocument: "revertCustomDocument",
				$onBackupCustomDocument: "backupCustomDocument",
				$onWillSaveCustomDocument: "willSaveCustomDocument",
				$onDidChangeCustomDocument: "didChangeCustomDocument",
			};
			const Suffix = ChannelMap[Method] ?? Method;
			Emitter.emit(`customEditor.${Suffix}`, Payload);
			break;
		}

		// Tree view selection/visibility/collapse/expand forwarded from Sky → Mountain
		case "$treeView:selectionChanged": {
			const P = Array.isArray(Parameters) ? Parameters[0] : Parameters;
			const ViewId = P?.viewId ?? P?.id ?? "";
			const ViewEmitters: Map<string, unknown> = (Context as any)
				?.__treeViewEmitters;
			if (ViewId && ViewEmitters) {
				const Emitter2 = ViewEmitters.get(ViewId) as any;
				Emitter2?.emit("treeView.selectionChanged", {
					selection: P?.selection ?? [],
				});
			}
			break;
		}
		case "$treeView:visibilityChanged": {
			const P = Array.isArray(Parameters) ? Parameters[0] : Parameters;
			const ViewId = P?.viewId ?? P?.id ?? "";
			const ViewEmitters: Map<string, unknown> = (Context as any)
				?.__treeViewEmitters;
			if (ViewId && ViewEmitters) {
				const Emitter2 = ViewEmitters.get(ViewId) as any;
				Emitter2?.emit("treeView.visibilityChanged", {
					visible: P?.visible ?? false,
				});
			}
			break;
		}
		case "$treeView:collapseElement": {
			const P = Array.isArray(Parameters) ? Parameters[0] : Parameters;
			const ViewId = P?.viewId ?? "";
			const ViewEmitters: Map<string, unknown> = (Context as any)
				?.__treeViewEmitters;
			if (ViewId && ViewEmitters) {
				const Emitter2 = ViewEmitters.get(ViewId) as any;
				Emitter2?.emit("treeView.collapseElement", {
					element: P?.element,
				});
			}
			break;
		}
		case "$treeView:expandElement": {
			const P = Array.isArray(Parameters) ? Parameters[0] : Parameters;
			const ViewId = P?.viewId ?? "";
			const ViewEmitters: Map<string, unknown> = (Context as any)
				?.__treeViewEmitters;
			if (ViewId && ViewEmitters) {
				const Emitter2 = ViewEmitters.get(ViewId) as any;
				Emitter2?.emit("treeView.expandElement", {
					element: P?.element,
				});
			}
			break;
		}

		// File lifecycle events fired by Mountain's VFS handlers after disk
		// mutations. These populate `onDidCreateFiles`, `onDidDeleteFiles`,
		// `onDidRenameFiles` for extensions like GitLens that track workspace
		// file changes outside of the editor's open-document flow.
		case "$acceptDidCreateFiles": {
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			const Files = Array.isArray(Payload?.files) ? Payload.files : [];
			if (Files.length > 0) {
				WorkspaceEventEmitter?.emit("didCreateFiles", { files: Files });
			}
			break;
		}
		case "$acceptDidDeleteFiles": {
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			const Files = Array.isArray(Payload?.files) ? Payload.files : [];
			if (Files.length > 0) {
				WorkspaceEventEmitter?.emit("didDeleteFiles", { files: Files });
			}
			break;
		}
		case "$acceptDidRenameFiles": {
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			const Files = Array.isArray(Payload?.files) ? Payload.files : [];
			if (Files.length > 0) {
				WorkspaceEventEmitter?.emit("didRenameFiles", { files: Files });
			}
			break;
		}

		default:
			// Generic handler for unknown notification types - survive
			// esbuild's production `drop: ["console"]` so unknown routes are
			// still grep-able in shipped builds.
			try {
				process.stdout.write(
					`[NotificationHandler] Generic notification handler for: ${Method}\n`,
				);
			} catch {}
			try {
				Emitter.emit("unknownNotification", {
					method: Method,
					parameters: Parameters,
				});
			} catch (EmitError) {
				// `EventEmitter.emit` rethrows the FIRST listener that
				// throws synchronously, abandoning the rest. Wrapping
				// here keeps the dispatcher itself robust against a
				// buggy "unknownNotification" subscriber. The error is
				// swallowed because the only purpose of this branch is
				// observability for unknown methods - failing the
				// notification dispatch on a logger crash would be
				// strictly worse than continuing.
				try {
					process.stdout.write(
						`[NotificationHandler] unknownNotification subscriber threw for ${Method}: ${
							(EmitError as any)?.message ?? String(EmitError)
						}\n`,
					);
				} catch {}
			}
	}
};

export default HandleSpecificNotification;
