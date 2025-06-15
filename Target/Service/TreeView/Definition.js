var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import * as TypeConverter from "../../TypeConverter.js";
import CommandService from "../Command/Service.js";
import IPCService from "../IPC/Service.js";
import TreeViewImplementation from "./TreeViewImplementation.js";
var Definition_default = Effect.gen(function* () {
  const IPC = yield* IPCService;
  const Command = yield* CommandService;
  const ActiveViews = yield* Ref.make(
    /* @__PURE__ */ new Map()
  );
  IPC.RegisterInvokeHandler(
    "$getChildren",
    ([ViewID, ParentHandle]) => Effect.gen(function* () {
      const View = (yield* Ref.get(ActiveViews)).get(ViewID);
      if (!View) {
        return [];
      }
      const ParentElement = ParentHandle ? View.handleToElementMap.get(ParentHandle) : void 0;
      return yield* View.GetChildrenEffect(ParentElement);
    }).pipe(Effect.runPromise)
  );
  IPC.RegisterInvokeHandler(
    "$disposeTreeView",
    ([ViewID]) => Effect.gen(function* () {
      const View = (yield* Ref.get(ActiveViews)).get(ViewID);
      if (View) {
        View.dispose();
        yield* Ref.update(
          ActiveViews,
          (Map2) => (Map2.delete(ViewID), Map2)
        );
      }
    }).pipe(Effect.runPromise)
  );
  const TreeViewImplementationFactory = {
    CreateTreeView: /* @__PURE__ */ __name((ViewID, Options, Extension) => Effect.gen(function* () {
      if ((yield* Ref.get(ActiveViews)).has(ViewID)) {
        return yield* Effect.fail(
          new Error(`Tree view '${ViewID}' already registered.`)
        );
      }
      if (!Options.treeDataProvider) {
        return yield* Effect.fail(
          new Error(
            "TreeViewOptions must include a TreeDataProvider."
          )
        );
      }
      const OptionDTO = TypeConverter.TreeView.Option.FromAPI(Options);
      yield* IPC.SendNotification("$registerTreeDataProvider", [
        ViewID,
        OptionDTO
      ]);
      const ExtHostView = new TreeViewImplementation(
        ViewID,
        Options.treeDataProvider,
        IPC,
        Command,
        Extension
      );
      yield* Ref.update(
        ActiveViews,
        (Map2) => Map2.set(ViewID, ExtHostView)
      );
      return ExtHostView;
    }), "CreateTreeView")
  };
  return TreeViewImplementationFactory;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
