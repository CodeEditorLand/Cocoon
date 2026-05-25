var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/TypeConverter/Main/View/Column.ts
var { ViewColumn: VSCodeViewColumn } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js");
var ActiveEditorGroup = -1;
var SideGroup = -2;
var FromAPI = /* @__PURE__ */ __name((ViewColumn) => {
  if (typeof ViewColumn !== "number") {
    return void 0;
  }
  switch (ViewColumn) {
    case VSCodeViewColumn.Active:
      return ActiveEditorGroup;
    case VSCodeViewColumn.Beside:
      return SideGroup;
    default:
      if (ViewColumn >= VSCodeViewColumn.One) {
        return ViewColumn - 1;
      }
  }
  return void 0;
}, "FromAPI");

// Source/Services/Window/Text/Document.ts
import { Effect } from "effect";
var ShowTextDocument = /* @__PURE__ */ __name((GRPCClient, Logger, Workspace_, DocumentOrUri, ColumnOrOptions, PreserveFocus) => Effect.gen(function* () {
  const Uri = "uri" in DocumentOrUri ? DocumentOrUri.uri : DocumentOrUri;
  yield* Logger.Info(
    `[WindowService] Showing text document: ${Uri.toString()}` + (ColumnOrOptions ? ` with options` : "")
  );
  let ViewColumnDTO;
  let PreserveFocusValue = PreserveFocus ?? false;
  let Selection = void 0;
  let Preview;
  if (typeof ColumnOrOptions === "number") {
    ViewColumnDTO = FromAPI(ColumnOrOptions);
  } else if (ColumnOrOptions) {
    const Options = ColumnOrOptions;
    ViewColumnDTO = FromAPI(Options.viewColumn);
    PreserveFocusValue = Options.preserveFocus ?? false;
    Preview = Options.preview;
    if (Options.selection) {
      Selection = Options.selection;
    }
  }
  yield* GRPCClient.showTextDocument(Uri.toString(), {
    viewColumn: ViewColumnDTO ? ViewColumnDTO + 2 : void 0,
    preserveFocus: PreserveFocusValue === true,
    preview: Preview === true,
    selection: Selection ? {
      line: Selection.start.line,
      character: Selection.start.character
    } : void 0
  });
  const EditorId = "editor-" + Uri.toString().slice(-8);
  yield* Logger.Debug(
    `[WindowService] Showed text document with ID: ${EditorId}`
  );
  const Editor = Workspace_.visibleTextEditors.find(
    (E) => E.id === EditorId
  );
  if (!Editor) {
    return yield* Effect.fail(
      new Error(
        `[WindowService] Could not find text editor with ID ${EditorId} after Mountain confirmation`
      )
    );
  }
  return Editor;
}), "ShowTextDocument");
var ShowInformationMessage = /* @__PURE__ */ __name((GRPCClient, Logger, Message, ...Items) => Effect.gen(function* () {
  yield* Logger.Debug(
    `[WindowService] Showing information message: ${Message}`
  );
  const InfoResponse = yield* Effect.tryPromise({
    try: /* @__PURE__ */ __name(() => GRPCClient.sendRequest("Window.ShowMessage", [
      {
        message: Message,
        level: "info",
        items: Items.map((I) => ({ title: I })),
        options: {}
      }
    ]), "try"),
    catch: /* @__PURE__ */ __name(() => null, "catch")
  });
  const InfoSelected = typeof InfoResponse === "string" ? InfoResponse : InfoResponse?.title ?? null;
  return InfoSelected ? Items.find((I) => I === InfoSelected) ?? InfoSelected : void 0;
}), "ShowInformationMessage");
var ShowWarningMessage = /* @__PURE__ */ __name((GRPCClient, Logger, Message, ...Items) => Effect.gen(function* () {
  yield* Logger.Debug(
    `[WindowService] Showing warning message: ${Message}`
  );
  const WarnResponse = yield* Effect.tryPromise({
    try: /* @__PURE__ */ __name(() => GRPCClient.sendRequest("Window.ShowMessage", [
      {
        message: Message,
        level: "warn",
        items: Items.map((I) => ({ title: I })),
        options: {}
      }
    ]), "try"),
    catch: /* @__PURE__ */ __name(() => null, "catch")
  });
  const WarnSelected = typeof WarnResponse === "string" ? WarnResponse : WarnResponse?.title ?? null;
  return WarnSelected ? Items.find((I) => I === WarnSelected) ?? WarnSelected : void 0;
}), "ShowWarningMessage");
var ShowErrorMessage = /* @__PURE__ */ __name((GRPCClient, Logger, Message, ...Items) => Effect.gen(function* () {
  yield* Logger.Debug(
    `[WindowService] Showing error message: ${Message}`
  );
  const ErrorResponse = yield* Effect.tryPromise({
    try: /* @__PURE__ */ __name(() => GRPCClient.sendRequest("Window.ShowMessage", [
      {
        message: Message,
        level: "error",
        items: Items.map((I) => ({ title: I })),
        options: {}
      }
    ]), "try"),
    catch: /* @__PURE__ */ __name(() => null, "catch")
  });
  const ErrorSelected = typeof ErrorResponse === "string" ? ErrorResponse : ErrorResponse?.title ?? null;
  return ErrorSelected ? Items.find(
    (I) => (typeof I === "string" ? I : I.title) === ErrorSelected
  ) ?? void 0 : void 0;
}), "ShowErrorMessage");
export {
  ShowErrorMessage,
  ShowInformationMessage,
  ShowTextDocument,
  ShowWarningMessage
};
//# sourceMappingURL=Document.js.map
