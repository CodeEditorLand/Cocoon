var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { ProcessingServiceError } from "./Error.js";
const InvokeProcessingService = /* @__PURE__ */ __name((TextContent) => Effect.tryPromise({
  try: /* @__PURE__ */ __name(() => fetch("http://localhost:3000/process", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: TextContent
  }).then((Response) => {
    if (!Response.ok) {
      throw new Error(
        `Server responded with status: ${Response.status}`
      );
    }
    return Response.json();
  }), "try"),
  catch: /* @__PURE__ */ __name((cause) => new ProcessingServiceError({ cause }), "catch")
}), "InvokeProcessingService");
export {
  InvokeProcessingService
};
//# sourceMappingURL=InvokeProcessingService.js.map
