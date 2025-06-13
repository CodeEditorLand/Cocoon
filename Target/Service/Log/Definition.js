var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
const Definition = Effect.succeed({
  Trace: /* @__PURE__ */ __name((message, ...data) => Effect.logTrace(message).pipe(
    Effect.annotateLogs("data", data.length === 1 ? data[0] : data)
  ), "Trace"),
  Debug: /* @__PURE__ */ __name((message, ...data) => Effect.logDebug(message).pipe(
    Effect.annotateLogs("data", data.length === 1 ? data[0] : data)
  ), "Debug"),
  Info: /* @__PURE__ */ __name((message, ...data) => Effect.logInfo(message).pipe(
    Effect.annotateLogs("data", data.length === 1 ? data[0] : data)
  ), "Info"),
  Warn: /* @__PURE__ */ __name((message, ...data) => Effect.logWarning(message).pipe(
    Effect.annotateLogs("data", data.length === 1 ? data[0] : data)
  ), "Warn"),
  Error: /* @__PURE__ */ __name((message, ...data) => Effect.logError(message).pipe(
    Effect.annotateLogs("data", data.length === 1 ? data[0] : data)
  ), "Error"),
  Fatal: /* @__PURE__ */ __name((message, ...data) => Effect.logFatal(message).pipe(
    Effect.annotateLogs("data", data.length === 1 ? data[0] : data)
  ), "Fatal")
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
