var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { FromAPI as RangeFromAPI } from "./TypeConverter/Main/Range.js";
import { FromAPI as ViewColumnFromAPI } from "./TypeConverter/Main/ViewColumn.js";
import { CreateEventStream } from "./Utility/CreateEventStream.js";
import { IPCService } from "./IPC.js";
import { WorkSpaceService } from "./WorkSpace.js";
class WindowService extends Effect.Service()(
  "Service/Window",
  {
    effect: Effect.gen(function* () {
      const IPC = yield* IPCService;
      const WorkSpace = yield* WorkSpaceService;
      const WindowStateRef = yield* Ref.make({
        focused: true,
        active: true
      });
      const { event: OnDidChangeWindowState, Fire: FireWindowState } = CreateEventStream();
      const AcceptWindowStateChanged = /* @__PURE__ */ __name((IsFocused) => {
        const NewState = { focused: IsFocused, active: IsFocused };
        return Ref.set(WindowStateRef, NewState).pipe(
          Effect.andThen(FireWindowState(NewState))
        );
      }, "AcceptWindowStateChanged");
      IPC.RegisterInvokeHandler(
        "$acceptWindowStateChanged",
        ([IsFocused]) => Effect.runPromise(AcceptWindowStateChanged(IsFocused))
      );
      const ShowTextDocument = /* @__PURE__ */ __name((documentOrUri, columnOrOptions, preserveFocus) => Effect.gen(function* () {
        const TheUri = "uri" in documentOrUri ? documentOrUri.uri : documentOrUri;
        const Options = typeof columnOrOptions === "object" ? columnOrOptions : void 0;
        const OptionsDTO = Options ? {
          preserveFocus: preserveFocus ?? Options.preserveFocus,
          selection: Options.selection ? RangeFromAPI(Options.selection) : void 0
        } : { preserveFocus: preserveFocus ?? false };
        const ViewColumnDTO = typeof columnOrOptions === "number" ? ViewColumnFromAPI(columnOrOptions) : void 0;
        const EditorId = yield* IPC.SendRequest(
          "$showTextDocument",
          [TheUri.toJSON(), ViewColumnDTO, OptionsDTO]
        );
        const Editor = WorkSpace.visibleTextEditors.find(
          (e) => e.id === EditorId
        );
        if (!Editor) {
          return yield* Effect.fail(
            new Error(
              `Could not find text editor with ID ${EditorId} after host confirmation.`
            )
          );
        }
        return Editor;
      }), "ShowTextDocument");
      const service = {
        get state() {
          return Effect.runSync(Ref.get(WindowStateRef));
        },
        onDidChangeWindowState: OnDidChangeWindowState,
        get activeTextEditor() {
          return WorkSpace.activeTextEditor;
        },
        ShowTextDocument
      };
      return service;
    })
  }
) {
  static {
    __name(this, "WindowService");
  }
}
export {
  WindowService
};
//# sourceMappingURL=Window.js.map
