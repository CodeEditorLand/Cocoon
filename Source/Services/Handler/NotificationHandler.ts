/**
 * @module Handler/NotificationHandler
 * @description
 * Handles Mountain notifications received via SendMountainNotification RPC.
 * Parses notification parameters, emits domain events, and delegates to
 * specific notification handlers (document content, extension change, etc.).
 *
 * Document lifecycle notifications also emit workspace events on the
 * WorkspaceEventEmitter so vscode API shim listeners fire correctly.
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
	HandleDocumentChange: (Cache: Map<string, string>, Parameters: any, WorkspaceEventEmitter?: EventEmitter) => void,
	HandleDocumentOpen: (Cache: Map<string, string>, Parameters: any, WorkspaceEventEmitter?: EventEmitter) => void,
	HandleDocumentClose: (Cache: Map<string, string>, Parameters: any, WorkspaceEventEmitter?: EventEmitter) => void,
	HandleDocumentSave: (Cache: Map<string, string>, Parameters: any, WorkspaceEventEmitter?: EventEmitter) => void,
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
			HandleDocumentChange(DocumentContentCache, Parameters, WorkspaceEventEmitter);
			break;
		case "$acceptModelAdded":
		case "$acceptModelOpen":
		case "document.didOpen":
			HandleDocumentOpen(DocumentContentCache, Parameters, WorkspaceEventEmitter);
			break;
		case "$acceptModelRemoved":
		case "$acceptModelClosed":
		case "document.didClose":
			HandleDocumentClose(DocumentContentCache, Parameters, WorkspaceEventEmitter);
			break;
		case "$acceptModelSaved":
		case "document.didSave":
			HandleDocumentSave(DocumentContentCache, Parameters, WorkspaceEventEmitter);
			break;
		default:
			// Generic handler for unknown notification types
			console.log(
				`[NotificationHandler] Generic notification handler for: ${Method}`,
			);
	}
};

export default HandleSpecificNotification;
