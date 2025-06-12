var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { ProcessingServiceError } from "../../Command/ProcessUserData/Error.js";
import { IpcProvider } from "../Ipc/mod.js";
const InvokeProcessingService = /* @__PURE__ */ __name((TextContent) => Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const Result = yield* _(
    Ipc.SendRequest(
      "$processText",
      // The conventional RPC method name
      { Content: TextContent }
    ),
    // Map any generic IPC error into our specific, tagged error for this workflow.
    Effect.mapError((cause) => new ProcessingServiceError({ cause }))
  );
  return Result;
}), "InvokeProcessingService");
export {
  InvokeProcessingService
};
//# sourceMappingURL=InvokeProcessingService.js.map
