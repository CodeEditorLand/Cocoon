var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { TreeView as TreeViewConverter } from "../../TypeConverter/TreeView.js";
import CommandService from "../Command/Service.js";
import IPCService from "../IPC/Service.js";
import TreeViewImplementation from "./TreeViewImplementation.js";
var Definition_default = Effect.gen(function* (G) {
  const IPC = yield* G(IPCService);
  const Command = yield* G(CommandService);
  const ActiveViewsRef = yield* G(
    Ref.make(/* @__PURE__ */ new Map())
  );
  const GetChildrenEffect = /* @__PURE__ */ __name((ViewID, ParentHandle) => Effect.gen(function* (G2) {
    const View = (yield* G2(Ref.get(ActiveViewsRef))).get(ViewID);
    if (!View) {
      return [];
    }
    const ParentElement = ParentHandle ? View.handleToElementMap.get(ParentHandle) : void 0;
    return yield* G2(View.GetChildrenEffect(ParentElement));
  }), "GetChildrenEffect");
  const DisposeTreeViewEffect = /* @__PURE__ */ __name((ViewID) => Effect.gen(function* (G2) {
    const View = (yield* G2(Ref.get(ActiveViewsRef))).get(ViewID);
    if (View) {
      View.dispose();
      yield* G2(
        Ref.update(
          ActiveViewsRef,
          (Map2) => (Map2.delete(ViewID), Map2)
        )
      );
    }
  }), "DisposeTreeViewEffect");
  yield* G(
    Effect.sync(() => {
      IPC.RegisterInvokeHandler(
        "$getChildren",
        ([ViewID, ParentHandle]) => Effect.runPromise(GetChildrenEffect(ViewID, ParentHandle))
      );
      IPC.RegisterInvokeHandler(
        "$disposeTreeView",
        ([ViewID]) => Effect.runPromise(DisposeTreeViewEffect(ViewID))
      );
    })
  );
  const TreeViewFactory = {
    CreateTreeView: /* @__PURE__ */ __name((ViewID, Options, Extension) => Effect.gen(function* (G2) {
      if ((yield* G2(Ref.get(ActiveViewsRef))).has(ViewID)) {
        return yield* G2(
          Effect.fail(
            new Error(
              `Tree view '${ViewID}' already registered.`
            )
          )
        );
      }
      if (!Options.treeDataProvider) {
        return yield* G2(
          Effect.fail(
            new Error(
              "TreeViewOptions must include a TreeDataProvider."
            )
          )
        );
      }
      const OptionDTO = TreeViewConverter.Option.FromAPI(Options);
      yield* G2(
        IPC.SendNotification("$registerTreeDataProvider", [
          ViewID,
          OptionDTO
        ])
      );
      const ExtHostView = new TreeViewImplementation(
        ViewID,
        Options.treeDataProvider,
        IPC,
        Command,
        Extension
      );
      yield* G2(
        Ref.update(
          ActiveViewsRef,
          (Map2) => Map2.set(ViewID, ExtHostView)
        )
      );
      return ExtHostView;
    }), "CreateTreeView")
  };
  return TreeViewFactory;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
