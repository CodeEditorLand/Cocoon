var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import * as TypeConverter from "../../TypeConverter/mod.js";
import { Commands } from "../Commands/mod.js";
import { IpcProvider } from "../Ipc/mod.js";
import { TreeViewImpl } from "./TreeViewImpl.js";
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const CommandsService = yield* _(Commands.Tag);
  const ActiveViews = yield* _(
    Ref.make(/* @__PURE__ */ new Map())
  );
  Ipc.RegisterInvokeHandler("$getChildren", ([ViewId, ParentHandle]) => {
    return Effect.gen(function* (_2) {
      const view = (yield* _2(Ref.get(ActiveViews))).get(ViewId);
      if (!view) return [];
      const parentElement = ParentHandle ? view["HandleCache"].get(ParentHandle) : void 0;
      return yield* _2(view.GetChildrenEffect(parentElement));
    }).pipe(Effect.runPromise);
  });
  const ServiceImplementation = {
    CreateTreeView: /* @__PURE__ */ __name((ViewId, Options, Extension) => Effect.gen(function* (_2) {
      if (!Options.treeDataProvider) {
        return yield* _2(
          Effect.fail(
            new Error(
              "TreeViewOptions must include a TreeDataProvider."
            )
          )
        );
      }
      const OptionsDto = TypeConverter.TreeView.Options.fromApi(Options);
      yield* _2(
        Ipc.SendNotification("$registerTreeDataProvider", [
          ViewId,
          OptionsDto
        ])
      );
      const ExtHostView = new TreeViewImpl(
        ViewId,
        Options.treeDataProvider,
        Ipc,
        CommandsService.converter,
        Extension
      );
      yield* _2(
        Ref.update(
          ActiveViews,
          (map) => map.set(ViewId, ExtHostView)
        )
      );
      return ExtHostView;
    }), "CreateTreeView")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
