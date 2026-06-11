var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Interfaces/I/Mountain/Client/Service.ts
import * as Effect from "effect/Effect";
var IMountainClientService = Effect.Service()(
  "Service/MountainClient",
  {
    effect: Effect.gen(function* () {
      return {};
    })
  }
);

// Source/Services/Window/Errors.ts
var WindowOperationError = class _WindowOperationError extends Error {
  static {
    __name(this, "WindowOperationError");
  }
  _tag = "WindowOperationError";
  operation;
  cause;
  constructor(operation, cause) {
    super(`Window operation '${operation}' failed: ${String(cause)}`);
    this.operation = operation;
    this.cause = cause;
    Object.setPrototypeOf(this, _WindowOperationError.prototype);
  }
  get name() {
    return "WindowOperationError";
  }
};
var DialogError = class _DialogError extends Error {
  static {
    __name(this, "DialogError");
  }
  _tag = "DialogError";
  dialogType;
  cause;
  constructor(dialogType, cause) {
    super(`Dialog operation '${dialogType}' failed: ${String(cause)}`);
    this.dialogType = dialogType;
    this.cause = cause;
    Object.setPrototypeOf(this, _DialogError.prototype);
  }
  get name() {
    return "DialogError";
  }
};
var QuickInputError = class _QuickInputError extends Error {
  static {
    __name(this, "QuickInputError");
  }
  _tag = "QuickInputError";
  inputType;
  cause;
  constructor(inputType, cause) {
    super(`Quick input operation '${inputType}' failed: ${String(cause)}`);
    this.inputType = inputType;
    this.cause = cause;
    Object.setPrototypeOf(this, _QuickInputError.prototype);
  }
  get name() {
    return "QuickInputError";
  }
};
var StatusBarError = class _StatusBarError extends Error {
  static {
    __name(this, "StatusBarError");
  }
  _tag = "StatusBarError";
  itemId;
  operation;
  cause;
  constructor(itemId, operation, cause) {
    super(
      `StatusBar '${itemId}' operation '${operation}' failed: ${String(cause)}`
    );
    this.itemId = itemId;
    this.operation = operation;
    this.cause = cause;
    Object.setPrototypeOf(this, _StatusBarError.prototype);
  }
  get name() {
    return "StatusBarError";
  }
};
var OutputChannelError = class _OutputChannelError extends Error {
  static {
    __name(this, "OutputChannelError");
  }
  _tag = "OutputChannelError";
  channelName;
  operation;
  cause;
  constructor(channelName, operation, cause) {
    super(
      `OutputChannel '${channelName}' operation '${operation}' failed: ${String(cause)}`
    );
    this.channelName = channelName;
    this.operation = operation;
    this.cause = cause;
    Object.setPrototypeOf(this, _OutputChannelError.prototype);
  }
  get name() {
    return "OutputChannelError";
  }
};
var WebviewPanelError = class _WebviewPanelError extends Error {
  static {
    __name(this, "WebviewPanelError");
  }
  _tag = "WebviewPanelError";
  viewType;
  operation;
  cause;
  constructor(viewType, operation, cause) {
    super(
      `WebviewPanel '${viewType}' operation '${operation}' failed: ${String(cause)}`
    );
    this.viewType = viewType;
    this.operation = operation;
    this.cause = cause;
    Object.setPrototypeOf(this, _WebviewPanelError.prototype);
  }
  get name() {
    return "WebviewPanelError";
  }
};
var ProgressError = class _ProgressError extends Error {
  static {
    __name(this, "ProgressError");
  }
  _tag = "ProgressError";
  operation;
  cause;
  constructor(operation, cause) {
    super(`Progress operation '${operation}' failed: ${String(cause)}`);
    this.operation = operation;
    this.cause = cause;
    Object.setPrototypeOf(this, _ProgressError.prototype);
  }
  get name() {
    return "ProgressError";
  }
};
var TextDocumentError = class _TextDocumentError extends Error {
  static {
    __name(this, "TextDocumentError");
  }
  _tag = "TextDocumentError";
  documentUri;
  operation;
  cause;
  constructor(documentUri, operation, cause) {
    super(
      `TextDocument '${documentUri}' operation '${operation}' failed: ${String(cause)}`
    );
    this.documentUri = documentUri;
    this.operation = operation;
    this.cause = cause;
    Object.setPrototypeOf(this, _TextDocumentError.prototype);
  }
  get name() {
    return "TextDocumentError";
  }
};

// Source/Services/Window/Dialog.ts
import { Context, Effect as Effect2, Layer } from "effect";
var DialogService = Context.Tag(
  "Service/Window/Dialog"
);
var DialogLive = Effect2.gen(function* () {
  const MountainClient = yield* IMountainClientService;
  const ShowMessage = /* @__PURE__ */ __name((operation, level, message, items) => Effect2.gen(function* () {
    const Response = yield* Effect2.tryPromise({
      try: /* @__PURE__ */ __name(() => MountainClient.sendRequest("Window.ShowMessage", [
        {
          message,
          level,
          items: items.map((Item) => ({ title: Item })),
          options: {}
        }
      ]), "try"),
      catch: /* @__PURE__ */ __name((cause) => new DialogError(operation, cause), "catch")
    });
    const Selected = typeof Response === "string" ? Response : Response?.title ?? null;
    return Selected ? items.find((Item) => Item === Selected) ?? Selected : void 0;
  }), "ShowMessage");
  const ShowInformationMessage = /* @__PURE__ */ __name((message, items = []) => ShowMessage("showInformationMessage", "info", message, items), "ShowInformationMessage");
  const ShowWarningMessage = /* @__PURE__ */ __name((message, items = []) => ShowMessage("showWarningMessage", "warning", message, items), "ShowWarningMessage");
  const ShowErrorMessage = /* @__PURE__ */ __name((message, items = []) => ShowMessage("showErrorMessage", "error", message, items), "ShowErrorMessage");
  return DialogService.of({
    ShowInformationMessage,
    ShowWarningMessage,
    ShowErrorMessage
  });
});
var DialogLayer = Layer.effect(DialogService, DialogLive);
export {
  DialogLayer,
  DialogLive,
  DialogService
};
//# sourceMappingURL=Dialog.js.map
