var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
class LoggerService extends Effect.Service()(
  "Service/Logger",
  {
    sync: /* @__PURE__ */ __name(() => ({
      Trace: /* @__PURE__ */ __name((Message, ...Data) => Effect.logTrace(Message).pipe(
        Effect.annotateLogs({
          data: Data.length === 1 ? Data[0] : Data
        })
      ), "Trace"),
      Debug: /* @__PURE__ */ __name((Message, ...Data) => Effect.logDebug(Message).pipe(
        Effect.annotateLogs({
          data: Data.length === 1 ? Data[0] : Data
        })
      ), "Debug"),
      Info: /* @__PURE__ */ __name((Message, ...Data) => Effect.logInfo(Message).pipe(
        Effect.annotateLogs({
          data: Data.length === 1 ? Data[0] : Data
        })
      ), "Info"),
      Warn: /* @__PURE__ */ __name((Message, ...Data) => Effect.logWarning(Message).pipe(
        Effect.annotateLogs({
          data: Data.length === 1 ? Data[0] : Data
        })
      ), "Warn"),
      Error: /* @__PURE__ */ __name((Message, ...Data) => Effect.logError(Message).pipe(
        Effect.annotateLogs({
          data: Data.length === 1 ? Data[0] : Data
        })
      ), "Error"),
      Fatal: /* @__PURE__ */ __name((Message, ...Data) => Effect.logFatal(Message).pipe(
        Effect.annotateLogs({
          data: Data.length === 1 ? Data[0] : Data
        })
      ), "Fatal")
    }), "sync")
  }
) {
  static {
    __name(this, "LoggerService");
  }
}
export {
  LoggerService
};
//# sourceMappingURL=Logger.js.map
