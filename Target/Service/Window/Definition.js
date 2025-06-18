var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import {
  EventEmitter
} from "vscode";
import RangeConverter from "../../TypeConverter/Main/Range.js";
import URIConverter from "../../TypeConverter/Main/URI.js";
import ViewColumnConverter from "../../TypeConverter/Main/ViewColumn.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
var Definition_default = Effect.gen(function* (G) {
  const IPC = yield* G(IPCService);
  const WindowStateRef = yield* G(
    Ref.make({ focused: true, active: true })
  );
  const TextEditorsMapRef = yield* G(Ref.make(/* @__PURE__ */ new Map()));
  const ActiveTextEditorRef = yield* G(
    Ref.make(void 0)
  );
  const VisibleTextEditorsRef = yield* G(Ref.make([]));
  const OnDidChangeWindowStateStream = CreateEventStream();
  const { event: OnDidChangeActiveTextEditorEvent, Fire: FireActiveEditor } = CreateEventStream();
  const {
    event: OnDidChangeVisibleTextEditorsEvent,
    Fire: FireVisibleEditors
  } = CreateEventStream();
  const AcceptWindowStateChangedEffect = /* @__PURE__ */ __name((isFocused) => {
    const NewState = { focused: isFocused, active: isFocused };
    return Ref.set(WindowStateRef, NewState).pipe(
      Effect.andThen(OnDidChangeWindowStateStream.Fire(NewState))
    );
  }, "AcceptWindowStateChangedEffect");
  const AcceptEditorStateEffect = /* @__PURE__ */ __name((activeEditorId, visibleEditorIds) => Effect.gen(function* (G2) {
    const Editors = yield* G2(Ref.get(TextEditorsMapRef));
    const NewActive = activeEditorId ? Editors.get(activeEditorId) : void 0;
    const NewVisible = visibleEditorIds.map((id) => Editors.get(id)).filter(Boolean);
    yield* G2(Ref.set(ActiveTextEditorRef, NewActive));
    yield* G2(
      Ref.set(VisibleTextEditorsRef, NewVisible)
    );
    yield* G2(FireActiveEditor(NewActive));
    yield* G2(FireVisibleEditors(NewVisible));
  }), "AcceptEditorStateEffect");
  yield* G(
    Effect.sync(() => {
      IPC.RegisterInvokeHandler(
        "$acceptWindowStateChanged",
        ([isFocused]) => Effect.runPromise(
          AcceptWindowStateChangedEffect(isFocused)
        )
      );
      IPC.RegisterInvokeHandler(
        "$acceptEditorState",
        ([activeId, visibleIds]) => Effect.runPromise(
          AcceptEditorStateEffect(activeId, visibleIds)
        )
      );
    })
  );
  const ServiceImplementation = {
    get state() {
      return Effect.runSync(Ref.get(WindowStateRef));
    },
    onDidChangeWindowState: OnDidChangeWindowStateStream.event,
    get activeTextEditor() {
      return Effect.runSync(Ref.get(ActiveTextEditorRef));
    },
    get visibleTextEditors() {
      return Effect.runSync(Ref.get(VisibleTextEditorsRef));
    },
    onDidChangeActiveTextEditor: OnDidChangeActiveTextEditorEvent,
    onDidChangeVisibleTextEditors: OnDidChangeVisibleTextEditorsEvent,
    // Stubs for other events, a full implementation would use CreateEventStream
    onDidChangeTextEditorSelection: new EventEmitter().event,
    onDidChangeTextEditorVisibleRanges: new EventEmitter().event,
    onDidChangeTextEditorOptions: new EventEmitter().event,
    onDidChangeTextEditorViewColumn: new EventEmitter().event,
    ShowTextDocument: /* @__PURE__ */ __name((documentOrURI, columnOrOptions, preserveFocus) => Effect.gen(function* (G2) {
      let uri;
      if ("uri" in documentOrURI) {
        uri = documentOrURI.uri;
      } else {
        uri = documentOrURI;
      }
      const options = typeof columnOrOptions === "object" ? columnOrOptions : void 0;
      const optionsDTO = options ? {
        preserveFocus: preserveFocus ?? options.preserveFocus,
        selection: options.selection ? RangeConverter.FromAPI(options.selection) : void 0
      } : void 0;
      const viewColumnDTO = typeof columnOrOptions === "number" ? ViewColumnConverter.FromAPI(columnOrOptions) : void 0;
      const editorId = yield* G2(
        IPC.SendRequest("$showTextDocument", [
          URIConverter.FromAPI(uri),
          viewColumnDTO,
          optionsDTO
        ])
      );
      const editor = (yield* G2(Ref.get(TextEditorsMapRef))).get(
        editorId
      );
      if (!editor) {
        return yield* G2(
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
