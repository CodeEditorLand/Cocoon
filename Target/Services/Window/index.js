var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// Source/Services/Window/Errors.ts
var Errors_exports = {};
__export(Errors_exports, {
  DialogError: () => DialogError,
  OutputChannelError: () => OutputChannelError,
  ProgressError: () => ProgressError,
  QuickInputError: () => QuickInputError,
  StatusBarError: () => StatusBarError,
  TextDocumentError: () => TextDocumentError,
  WebviewPanelError: () => WebviewPanelError,
  WindowOperationError: () => WindowOperationError
});
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

// Source/Services/Window/Types.ts
var Types_exports = {};

// Source/Services/Window/State.ts
import { Context, Effect, Ref } from "effect";
var WindowStateService = Context.Tag(
  "Service/Window/State"
);
var WindowStateLive = Effect.gen(function* () {
  const Logger = yield* Effect.serviceOption(Logger);
  const stateRef = yield* Ref.make({
    focused: true,
    active: true
  });
  const getState = Ref.get(stateRef);
  const setState = /* @__PURE__ */ __name((newState) => Effect.gen(function* () {
    const currentState = yield* getState;
    if (currentState.focused !== newState.focused || currentState.active !== newState.active) {
      yield* Logger.pipe(
        Effect.map(
          (logger) => logger.Info(
            `[WindowState] State changed: focused=${newState.focused}, active=${newState.active}`
          )
        ),
        Effect.orElse(() => Effect.void)
      );
    }
    yield* Ref.set(stateRef, newState);
    return newState;
  }), "setState");
  const onStateChange = Effect.void;
  return WindowStateService.of({
    getState,
    setState,
    onStateChange
  });
});
var WindowStateLayer = Layer.effect(
  WindowStateService,
  WindowStateLive
);

// Source/Services/Window/Dialog.ts
import { Context as Context2, Effect as Effect2, Layer as Layer2 } from "effect";
var DialogService = Context2.Tag(
  "Service/Window/Dialog"
);
var DialogLive = Effect2.gen(function* () {
  const ShowInformationMessage = /* @__PURE__ */ __name((message, items = []) => Effect2.gen(function* () {
    return void 0;
  }), "ShowInformationMessage");
  const ShowWarningMessage = /* @__PURE__ */ __name((message, items = []) => Effect2.gen(function* () {
    return void 0;
  }), "ShowWarningMessage");
  const ShowErrorMessage = /* @__PURE__ */ __name((message, items = []) => Effect2.gen(function* () {
    return void 0;
  }), "ShowErrorMessage");
  return DialogService.of({
    ShowInformationMessage,
    ShowWarningMessage,
    ShowErrorMessage
  });
});
var DialogLayer = Layer2.effect(DialogService, DialogLive);
export {
  DialogLayer,
  DialogLive,
  DialogService,
  Errors_exports as WindowErrors,
  WindowStateLayer,
  WindowStateLive,
  WindowStateService,
  Types_exports as WindowTypes
};
//# sourceMappingURL=index.js.map
