var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import IPCService from "../../Service/IPC/Service.js";
import { ProcessingServiceError } from "./Error.js";
const InvokeProcessingService = /* @__PURE__ */ __name((TextContent) => {
  return Effect.gen(function* () {
    const IPC = yield* IPCService;
    return yield* IPC.SendRequest("$processText", [
      TextContent
    ]).pipe(
      Effect.mapError((Cause) => new ProcessingServiceError({ Cause }))
    );
  });
}, "InvokeProcessingService");
var InvokeProcessingService_default = InvokeProcessingService;
export {
  InvokeProcessingService_default as default
};
//# sourceMappingURL=InvokeProcessingService.js.map
