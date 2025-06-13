var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { IPC } from "../../Service/IPC.js";
import { ProcessingServiceError } from "./Error.js";
function InvokeProcessingService(TextContent) {
  return Effect.gen(function* (_) {
    const IPCService = yield* _(IPC.Tag);
    return yield* _(
      IPCService.SendRequest("$processText", [
        TextContent
      ]),
      Effect.mapError((cause) => new ProcessingServiceError({ cause }))
    );
  });
}
__name(InvokeProcessingService, "InvokeProcessingService");
export {
  InvokeProcessingService
};
//# sourceMappingURL=InvokeProcessingService.js.map
