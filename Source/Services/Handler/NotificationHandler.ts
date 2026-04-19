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
