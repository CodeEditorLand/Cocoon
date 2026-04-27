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

import type { HandlerContext } from "./HandlerContext.js";
import * as WindowNamespaceModule from "./VscodeAPI/WindowNamespace.js";

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
 * esbuild tree-shakes that path out of `CocoonMain.js` (bundle scan confirms
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
	await import("@codeeditorland/output/vs/base/common/uri");
type UriObject = {
	scheme: string;
	authority: string;
	path: string;
	query: string;
	fragment: string;
	fsPath: string;
	toString(): string;
};
const HydrateUri = (Raw: string | UriObject | undefined): UriObject | null => {
	if (!Raw) return null;
	if (typeof Raw === "string") {
		try {
			return (
				LazyURI as unknown as { parse: (s: string) => UriObject }
			).parse(Raw);
		} catch {
			return null;
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
		return (
			LazyURI as unknown as { parse: (s: string) => UriObject }
		).parse(Raw.toString());
	} catch {
		return null;
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
			// `landfix-rejection-verbose` so `LAND_DEV_LOG=short` runs
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
			// `~/.land/extensions/<extId>/` or
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
				!process.env["LAND_DEV_LOG"]?.includes(
					"landfix-rejection-verbose",
				)
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
			break;
		case "window.blurred":
			Emitter.emit("windowBlurred", Parameters);
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
						import("./ExtensionHostHandler.js")
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
			break;
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
					import(
						"./VscodeAPI/WindowNamespace.js"
					).then(({ WebviewViewBuilders: _Builders }) => {
						/* builders are factories - no per-instance state to dispose here */
					});
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
					import("./WorkspaceContainsActivator.js")
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
			Emitter.emit("debug.didStartSession", Payload);
			break;
		}
		case "$onDidTerminateDebugSession": {
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			Emitter.emit("debug.didTerminateSession", Payload);
			break;
		}
		case "$onDidChangeActiveDebugSession": {
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
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
			const ProviderEntry = WindowNamespaceModule
				.CustomEditorProvidersByViewType
				.get(ViewType);
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
				uri: UriComponents,
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
				const Result = Resolve.call(
					Provider,
					Document,
					WebviewPanel,
					{ isCancellationRequested: false },
				) as unknown;
				if (Result && typeof (Result as PromiseLike<unknown>).then === "function") {
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
			const ChannelMap:Record<string, string> = {
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
		default:
			// Generic handler for unknown notification types - survive
			// esbuild's production `drop: ["console"]` so unknown routes are
			// still grep-able in shipped builds.
			try {
				process.stdout.write(
					`[NotificationHandler] Generic notification handler for: ${Method}\n`,
				);
			} catch {}
			Emitter.emit("unknownNotification", {
				method: Method,
				parameters: Parameters,
			});
	}
};

export default HandleSpecificNotification;
