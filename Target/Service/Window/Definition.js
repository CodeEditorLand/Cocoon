var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref, Stream } from "effect";
import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC } from "../IPC.js";
import { WorkSpace } from "../WorkSpace.js";
const Definition = Effect.gen(function* (_) {
  const IPCService = yield* _(IPC.Tag);
  const WorkSpaceService = yield* _(WorkSpace.Tag);
  const WindowStateRef = yield* _(
    Ref.make({ focused: true })
    // Initial optimistic state
  );
  const OnDidChangeWindowState = CreateEventStream();
  IPCService.RegisterInvokeHandler(
    "$acceptWindowStateChanged",
    ([isFocused]) => {
      const newState = { focused: isFocused };
      return Ref.set(WindowStateRef, newState).pipe(
        Effect.flatMap(() => OnDidChangeWindowState.Fire(newState)),
        Effect.runPromise
      );
    }
  );
  const ServiceImplementation = {
    get state() {
      return Ref.get(WindowStateRef).pipe(Effect.runSync);
    },
    onDidChangeWindowState: OnDidChangeWindowState.Stream.pipe(
      Stream.toEvent
    ),
    // These properties are delegated from the WorkSpace service, which is the
    // source of truth for editor states.
    get activeTextEditor() {
      return WorkSpaceService.activeTextEditor;
    },
    get visibleTextEditors() {
      return WorkSpaceService.visibleTextEditors;
    },
    onDidChangeActiveTextEditor: WorkSpaceService.onDidChangeActiveTextEditor,
    onDidChangeVisibleTextEditors: WorkSpaceService.onDidChangeVisibleTextEditors,
    ShowTextDocument: /* @__PURE__ */ __name((documentOrURI, columnOrOptions, preserveFocus) => Effect.gen(function* (_2) {
      let uri;
      if (documentOrURI.uri) {
        uri = documentOrURI.uri;
      } else {
        uri = documentOrURI;
      }
      const optionsDTO = columnOrOptions ? {
        // Convert TextDocumentShowOptions to DTO
        preserveFocus: preserveFocus ?? columnOrOptions.preserveFocus,
        selection: columnOrOptions.selection ? TypeConverter.RangeConverter.FromAPI(
          columnOrOptions.selection
        ) : void 0
      } : void 0;
      const viewColumnDTO = typeof columnOrOptions === "number" ? TypeConverter.ViewColumnConverter.FromAPI(
        columnOrOptions
      ) : void 0;
      const editorId = yield* _2(
        IPCService.SendRequest("$showTextDocument", [
          TypeConverter.URIConverter.FromAPI(uri),
          viewColumnDTO,
          optionsDTO
        ])
      );
      const editor = WorkSpaceService.findTextEditorById(editorId);
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
  Definition
};
//# sourceMappingURL=Definition.js.map
