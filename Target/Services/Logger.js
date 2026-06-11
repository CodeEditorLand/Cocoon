var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Logger.ts
import { Context, Effect, Ref } from "effect";
var Logger = Context.Tag("Service/Logger");
var LoggerService = class extends Effect.Service()(
  "Service/Logger",
  {
    effect: Effect.gen(function* () {
      const ExtensionIdRef = yield* Ref.make(
        void 0
      );
      const LogLevelRef = yield* Ref.make("info");
      const FormatMessage = /* @__PURE__ */ __name((Message, Level, ExtensionId) => {
        const Timestamp = (/* @__PURE__ */ new Date()).toISOString();
        const Prefix = `[${Level.toUpperCase()}${ExtensionId ? `:${ExtensionId}` : ""}]`;
        return `${Timestamp} ${Prefix} ${Message}`;
      }, "FormatMessage");
      const ForwardToMountain = /* @__PURE__ */ __name((Level, Line) => {
        const Stream = Level === "error" || Level === "fatal" ? process.stderr : process.stdout;
        Stream.write(`${Line}
`);
      }, "ForwardToMountain");
      const Trace = /* @__PURE__ */ __name((Message, ...Data) => Effect.gen(function* () {
        const LogLevel = yield* Ref.get(LogLevelRef);
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        if (LogLevel === "trace") {
          ForwardToMountain(
            "trace",
            FormatMessage(Message, "trace", ExtensionId)
          );
          return yield* Effect.logTrace(Message).pipe(
            Effect.annotateLogs({
              extensionId: ExtensionId,
              data: Data.length === 1 ? Data[0] : Data
            })
          );
        }
      }), "Trace");
      const Debug = /* @__PURE__ */ __name((Message, ...Data) => Effect.gen(function* () {
        const LogLevel = yield* Ref.get(LogLevelRef);
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        if (LogLevel === "trace" || LogLevel === "debug") {
          ForwardToMountain(
            "debug",
            FormatMessage(Message, "debug", ExtensionId)
          );
          return yield* Effect.logDebug(Message).pipe(
            Effect.annotateLogs({
              extensionId: ExtensionId,
              data: Data.length === 1 ? Data[0] : Data
            })
          );
        }
      }), "Debug");
      const Info = /* @__PURE__ */ __name((Message, ...Data) => Effect.gen(function* () {
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        ForwardToMountain(
          "info",
          FormatMessage(Message, "info", ExtensionId)
        );
        return yield* Effect.logInfo(Message).pipe(
          Effect.annotateLogs({
            extensionId: ExtensionId,
            data: Data.length === 1 ? Data[0] : Data
          })
        );
      }), "Info");
      const Warn = /* @__PURE__ */ __name((Message, ...Data) => Effect.gen(function* () {
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        ForwardToMountain(
          "warn",
          FormatMessage(Message, "warn", ExtensionId)
        );
        return yield* Effect.logWarning(Message).pipe(
          Effect.annotateLogs({
            extensionId: ExtensionId,
            data: Data.length === 1 ? Data[0] : Data
          })
        );
      }), "Warn");
      const Error2 = /* @__PURE__ */ __name((Message, ...Data) => Effect.gen(function* () {
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        ForwardToMountain(
          "error",
          FormatMessage(Message, "error", ExtensionId)
        );
        return yield* Effect.logError(Message).pipe(
          Effect.annotateLogs({
            extensionId: ExtensionId,
            data: Data.length === 1 ? Data[0] : Data
          })
        );
      }), "Error");
      const Fatal = /* @__PURE__ */ __name((Message, ...Data) => Effect.gen(function* () {
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        ForwardToMountain(
          "fatal",
          FormatMessage(Message, "fatal", ExtensionId)
        );
        return yield* Effect.logFatal(Message).pipe(
          Effect.annotateLogs({
            extensionId: ExtensionId,
            data: Data.length === 1 ? Data[0] : Data
          })
        );
      }), "Fatal");
      const SetExtensionId = /* @__PURE__ */ __name((ExtensionId) => Effect.gen(function* () {
        yield* Ref.set(ExtensionIdRef, ExtensionId);
      }), "SetExtensionId");
      const GetExtensionId = /* @__PURE__ */ __name(() => Effect.gen(function* () {
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        return ExtensionId ?? "cocoon-core";
      }), "GetExtensionId");
      const ServiceImplementation = {
        Trace,
        Debug,
        Info,
        Warn,
        Error: Error2,
        Fatal,
        SetExtensionId,
        GetExtensionId
      };
      return ServiceImplementation;
    })
  }
) {
  static {
    __name(this, "LoggerService");
  }
};
export {
  Logger,
  LoggerService
};
//# sourceMappingURL=Logger.js.map
