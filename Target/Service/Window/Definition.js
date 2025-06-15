var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref, Stream } from "effect";
import * as TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import WorkSpaceService from "../WorkSpace/Service.js";
var Definition_default = Effect.gen(function* (_) {
  const IPC = yield* _(IPCService);
  const WorkSpace = yield* _(WorkSpaceService);
  const WindowStateRef = yield* _(
    Ref.make({ focused: true, active: true })
  );
  const OnDidChangeWindowState = CreateEventStream();
  IPC.RegisterInvokeHandler("$acceptWindowStateChanged", ([isFocused]) => {
    const newState = { focused: isFocused, active: isFocused };
    return Ref.set(WindowStateRef, newState).pipe(
      Effect.flatMap(() => OnDidChangeWindowState.Fire(newState)),
      Effect.runPromise
    );
  });
  const ServiceImplementation = {
    get state() {
      return Ref.get(WindowStateRef).pipe(Effect.runSync);
    },
    onDidChangeWindowState: Stream.toEvent(OnDidChangeWindowState.Stream),
    // These properties are delegated from the WorkSpace service, which is the
    // source of truth for editor states.
    get activeTextEditor() {
      return WorkSpace.activeTextEditor;
    },
    get visibleTextEditors() {
      return WorkSpace.visibleTextEditors;
    },
    onDidChangeActiveTextEditor: WorkSpace.onDidChangeActiveTextEditor,
    onDidChangeVisibleTextEditors: WorkSpace.onDidChangeVisibleTextEditors,
    ShowTextDocument: /* @__PURE__ */ __name((documentOrURI, columnOrOptions, preserveFocus) => Effect.gen(function* (_2) {
      let uri;
      if ("uri" in documentOrURI) {
        uri = documentOrURI.uri;
      } else {
        uri = documentOrURI;
      }
      const optionsDTO = columnOrOptions ? {
        // Convert TextDocumentShowOptions to DTO
        preserveFocus: preserveFocus ?? columnOrOptions.preserveFocus,
        selection: columnOrOptions.selection ? TypeConverter.Range.FromAPI(
          columnOrOptions.selection
        ) : void 0
      } : void 0;
      const viewColumnDTO = typeof columnOrOptions === "number" ? TypeConverter.ViewColumn.FromAPI(columnOrOptions) : void 0;
      const editorId = yield* _2(
        IPC.SendRequest("$showTextDocument", [
          TypeConverter.URI.FromAPI(uri),
          viewColumnDTO,
          optionsDTO
        ])
      );
      const editor = WorkSpace.findTextEditorById(editorId);
      if (!editor) {
        return yield* _2(
          Effect.fail(
            new Error(
              `Could not find text editor with ID ${editorId}`
            )
          )
        );
      }
      return editor;
    }), "ShowTextDocument")
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
