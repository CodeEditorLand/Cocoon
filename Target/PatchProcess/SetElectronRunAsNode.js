import { Effect } from "effect";
const SetElectronRunAsNode = Effect.sync(() => {
  process.env["ELECTRON_RUN_AS_NODE"] = "1";
}).pipe(
  Effect.tap(
    () => Effect.logTrace("Set `ELECTRON_RUN_AS_NODE` environment variable.")
  )
);
var SetElectronRunAsNode_default = SetElectronRunAsNode;
export {
  SetElectronRunAsNode_default as default
};
//# sourceMappingURL=SetElectronRunAsNode.js.map
