var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/NotificationHandler.ts
var HandleSpecificNotification = /* @__PURE__ */ __name((Emitter, DocumentContentCache, HandleDocumentChange, HandleDocumentOpen, HandleDocumentClose, HandleDocumentSave, Method, Parameters, WorkspaceEventEmitter) => {
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
        WorkspaceEventEmitter
      );
      break;
    case "$acceptModelAdded":
    case "$acceptModelOpen":
    case "document.didOpen":
      HandleDocumentOpen(
        DocumentContentCache,
        Parameters,
        WorkspaceEventEmitter
      );
      break;
    case "$acceptModelRemoved":
    case "$acceptModelClosed":
    case "document.didClose":
      HandleDocumentClose(
        DocumentContentCache,
        Parameters,
        WorkspaceEventEmitter
      );
      break;
    case "$acceptModelSaved":
    case "document.didSave":
      HandleDocumentSave(
        DocumentContentCache,
        Parameters,
        WorkspaceEventEmitter
      );
      break;
    case "webview.message": {
      const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
      if (Payload?.handle) {
        Emitter.emit(`webview.message:${Payload.handle}`, Payload.message);
      }
      break;
    }
    case "webview.dispose": {
      const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
      if (Payload?.handle) {
        Emitter.emit(`webview.dispose:${Payload.handle}`);
      }
      break;
    }
    case "webview.viewState": {
      const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
      if (Payload?.handle) {
        Emitter.emit(`webview.viewState:${Payload.handle}`, {
          active: Payload.active,
          visible: Payload.visible,
          viewColumn: Payload.viewColumn
        });
      }
      break;
    }
    case "$fileWatcher:event":
      {
        const Event = Array.isArray(Parameters) ? Parameters[0] : Parameters;
        if (Event?.handle && Event.kind && Event.path) {
          Emitter.emit(`fileWatcher:${Event.handle}`, {
            kind: Event.kind,
            path: Event.path
          });
        }
      }
      break;
    default:
      try {
        process.stdout.write(
          `[NotificationHandler] Generic notification handler for: ${Method}
`
        );
      } catch {
      }
      Emitter.emit("unknownNotification", {
        method: Method,
        parameters: Parameters
      });
  }
}, "HandleSpecificNotification");
var NotificationHandler_default = HandleSpecificNotification;
export {
  NotificationHandler_default as default
};
//# sourceMappingURL=NotificationHandler.js.map
