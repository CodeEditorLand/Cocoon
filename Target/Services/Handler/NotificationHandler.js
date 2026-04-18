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
    default:
      try {
        process.stdout.write(
          `[NotificationHandler] Generic notification handler for: ${Method}
`
        );
      } catch {
      }
      Emitter.emit("unknownNotification", { method: Method, parameters: Parameters });
  }
}, "HandleSpecificNotification");
var NotificationHandler_default = HandleSpecificNotification;
export {
  NotificationHandler_default as default
};
//# sourceMappingURL=NotificationHandler.js.map
