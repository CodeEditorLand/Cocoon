var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import * as TypeConverter from "../../TypeConverter.js";
import { Command } from "../Command.js";
import { IPC } from "../IPC.js";
import { TreeViewImplementation } from "./TreeViewImplementation.js";
const Definition = Effect.gen(function* (_) {
  const IPCService = yield* _(IPC.Tag);
  const CommandService = yield* _(Command.Tag);
  const ActiveViews = yield* _(
    Ref.make(/* @__PURE__ */ new Map())
  );
  IPCService.RegisterInvokeHandler(
    "$getChildren",
    ([ViewID, ParentHandle]) => Effect.gen(function* (_2) {
      const view = (yield* _2(Ref.get(ActiveViews))).get(ViewID);
      if (!view) {
        return [];
      }
      const parentElement = ParentHandle ? view["handleToElementMap"].get(ParentHandle) : void 0;
      return yield* _2(view.getChildrenEffect(parentElement));
    }).pipe(Effect.runPromise)
  );
  IPCService.RegisterInvokeHandler(
    "$disposeTreeView",
    ([ViewID]) => Effect.gen(function* (_2) {
      const view = (yield* _2(Ref.get(ActiveViews))).get(ViewID);
      if (view) {
        view.dispose();
        yield* _2(
          Ref.update(ActiveViews, (map) => (map.delete(ViewID), map))
        );
      }
    }).pipe(Effect.runPromise)
  );
  const ServiceImplementation = {
    CreateTreeView: /* @__PURE__ */ __name((ViewID, Option, Extension) => Effect.gen(function* (_2) {
      if ((yield* _2(Ref.get(ActiveViews))).has(ViewID)) {
        return yield* _2(
          Effect.fail(
            new Error(
              `Tree view '${ViewID}' already registered.`
            )
          )
        );
      }
      if (!Option.treeDataProvider) {
        return yield* _2(
          Effect.fail(
            new Error(
              "TreeViewOptions must include a TreeDataProvider."
            )
          )
        );
      }
      const OptionDTO = TypeConverter.TreeView.Option.FromAPI(Option);
      yield* _2(
        IPCService.SendNotification("$registerTreeDataProvider", [
          ViewID,
          OptionDTO
        ])
      );
      const ExtHostView = new TreeViewImplementation(
        ViewID,
        Option.treeDataProvider,
        IPCService,
        CommandService,
        Extension
      );
      yield* _2(
        Ref.update(
          ActiveViews,
          (map) => map.set(ViewID, ExtHostView)
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
