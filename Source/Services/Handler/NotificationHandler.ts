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
 * | `Emitter`                | `extensionChanged`, `configurationChanged`, `windowFocused`, `windowBlurred`, `systemShutdown`, `webview.message:<handle>`, `webview.dispose:<handle>`, `webview.viewState:<handle>`, `fileWatcher:<handle>`, `unknownNotification` |
 * | `WorkspaceEventEmitter`  | `didOpenTextDocument`, `didChangeTextDocument`, `didCloseTextDocument`, `didSaveTextDocument` |
 *
 * ## Why two emitters
 *
 * Text-document events are high-volume (one per keystroke when an
 * extension is in `onDidChangeTextDocument`) and have a distinct
 * subscriber population — they must not block on
 * extension-lifecycle listeners. Keeping them on a dedicated emitter
 * bounds the worst-case fan-out cost.
 *
 * ## Subscription contracts
 *
 * All emitters use Node's built-in `EventEmitter`. Subscribers added via
 * the vscode API shims (in `Handler/VscodeAPI/*`) return a VS Code
 * `Disposable` whose `dispose()` calls `Emitter.removeListener`. The
 * per-event memory leak check (`MaxListeners`) is left at the Node
 * default (10) — extensions that register >10 listeners receive a
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
 * Atom I3 — last-resort uncaught-exception handler.
 *
 * The project's `PatchProcess/Patcher.ts` registers one via an Effect, but
 * esbuild tree-shakes that path out of `CocoonMain.js` (bundle scan confirms
 * zero `uncaughtException` strings). Without a handler, Node's default is
 * log-and-exit-1, which is exactly how we've been losing Cocoon when the
 * built-in `gulp` extension throws on workspace folder changes.
 *
 * This module-level registration is intentionally colocated with the
 * notification dispatch because that's where the explosive event cascades
 * fan out to extension callbacks. One handler is enough — Node dedupes via
 * reference and we only register once per process.
 */
const { URI: LazyURI } = await import(
	"@codeeditorland/output/vs/base/common/uri"
);
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
			return (LazyURI as unknown as { parse: (s: string) => UriObject }).parse(
				Raw,
			);
		} catch {
			return null;
		}
	}
	// Already a URI-shaped object — check for the critical getters extensions
	// rely on (`fsPath`, `toString`). If present, use as-is; otherwise try to
	// reparse via `toString()`.
	if (
		typeof Raw.toString === "function" &&
		typeof (Raw as UriObject).fsPath === "string"
	)
		return Raw;
	try {
		return (LazyURI as unknown as { parse: (s: string) => UriObject }).parse(
			Raw.toString(),
		);
	} catch {
		return null;
	}
};

// Register once at module load so any sync throw inside a listener chain
// cannot nuke the extension host.
if (!(process as { _landUncaughtHandlerInstalled?: boolean })._landUncaughtHandlerInstalled) {
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
			process.stdout.write(
				`[LandFix:UnhandledRejection] ${Stack ?? "unknown"}\n`,
			);
		} catch {}
	});
	(process as { _landUncaughtHandlerInstalled?: boolean })._landUncaughtHandlerInstalled = true;
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
		Removed.map((Folder) => Folder?.uri ?? "").filter((Uri) => Uri.length > 0),
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
	// Re-index so the exposed list stays VS Code–compatible.
	for (let Index = 0; Index < Kept.length; Index += 1) {
		Kept[Index] = { ...Kept[Index], index: Index };
	}
	Workspace.folders = Kept;
	// Workspace.workspaceData mirror for consumers that read the alternate
	// shape — keep them in sync so no extension reads stale state.
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
 * throws — which skips every subsequent listener AND propagates the
 * error up, crashing the extension host when an extension's listener
 * has an uncaught bug.
 *
 * Atom I2 (2026-04-21): the built-in `gulp` extension's
 * `TaskDetector.updateWorkspaceFolders` throws
 * `ERR_INVALID_ARG_TYPE` (`path.join(undefined, …)`) whenever the
 * workspace transitions from empty to one-folder. Without SafeEmit,
 * that kills Cocoon with exit code 1 — every extension dies, and the
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
					? (Err.stack.split("\n").slice(0, 3).join(" | "))
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
				const Models = Array.isArray(Parameters) ? Parameters : [Parameters];
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
			// { handle, message } — the webview posted a message to the extension.
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			if (Payload?.handle) {
				Emitter.emit(`webview.message:${Payload.handle}`, Payload.message);
			}
			break;
		}
		case "webview.dispose": {
			const Payload = Array.isArray(Parameters)
				? Parameters[0]
				: Parameters;
			if (Payload?.handle) {
				Emitter.emit(`webview.dispose:${Payload.handle}`);
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
			const AddedHydrated = Added.map((W, I) => HydrateFolder(W, I)).filter(
				(V): V is Exclude<typeof V, null> => V !== null,
			);
			const RemovedHydrated = Removed.map((W, I) => HydrateFolder(W, I)).filter(
				(V): V is Exclude<typeof V, null> => V !== null,
			);
			const MergedHydrated = Merged.map((W, I) => HydrateFolder(W, I)).filter(
				(V): V is Exclude<typeof V, null> => V !== null,
			);
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
			const Payload = Array.isArray(Parameters) ? Parameters : [Parameters];
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
			const Payload = Array.isArray(Parameters) ? Parameters : [Parameters];
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
				const Event = (Array.isArray(Parameters)
					? Parameters[0]
					: Parameters) as
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
		default:
			// Generic handler for unknown notification types — survive
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
