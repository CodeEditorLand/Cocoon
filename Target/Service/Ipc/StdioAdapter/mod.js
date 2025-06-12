var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Readline from "node:readline";
import { Effect, Layer, Ref } from "effect";
import { Tag as DispatcherTag } from "../Dispatcher/Service.js";
import { Tag as IpcServiceTag } from "../Service.js";
import { StdioError } from "./Error.js";
const Live = Layer.scoped(
  IpcServiceTag,
  Effect.gen(function* (_) {
    const Dispatcher = yield* _(DispatcherTag);
    const PendingRequests = yield* _(
      Ref.make(/* @__PURE__ */ new Map())
    );
    const RequestIdCounter = yield* _(Ref.make(1));
    const LineReader = Readline.createInterface({ input: process.stdin });
    const handleLine = /* @__PURE__ */ __name((Line) => Effect.gen(function* (_2) {
      const Message = yield* _2(
        Effect.try({
          try: /* @__PURE__ */ __name(() => JSON.parse(Line), "try"),
          catch: /* @__PURE__ */ __name((cause) => new StdioError({
            cause,
            context: "JsonParseFailed"
          }), "catch")
        })
      );
      if (Message.id && Message.result !== void 0) {
        const MaybeRequest = yield* _2(Ref.get(PendingRequests));
        const Pending = MaybeRequest.get(Message.id);
        if (Pending) {
          clearTimeout(Pending.Timeout);
          Pending.Resume(Effect.succeed(Message.result));
          yield* _2(
            Ref.update(
              PendingRequests,
              (map) => (map.delete(Message.id), map)
            )
          );
        }
      } else if (Message.method) {
        yield* _2(
          Dispatcher.DispatchNotification(
            Message.method,
            Message.params
          )
        );
      }
    }).pipe(
      Effect.catchAll(
        (error) => Effect.logError(
          "Error processing incoming stdio line",
          error
        )
      )
    ), "handleLine");
    LineReader.on("line", (Line) => Effect.runFork(handleLine(Line)));
    yield* _(
      Effect.addFinalizer(() => Effect.sync(() => LineReader.close()))
    );
    yield* _(
      Effect.logInfo(
        "Stdio IPC adapter initialized and listening on stdin."
      )
    );
    return IpcServiceTag.of({
      SendRequest: /* @__PURE__ */ __name((Method, Parameters, TimeoutMs = 3e4) => Effect.gen(function* (_2) {
        const RequestId = yield* _2(
          Ref.getAndUpdate(RequestIdCounter, (n) => n + 1)
        );
        const RequestPayload = {
          type: "request",
          id: RequestId,
          method: Method,
          params: Parameters
        };
        return yield* _2(
          Effect.async((resume) => {
            const TimeoutHandle = setTimeout(() => {
              Ref.get(PendingRequests).pipe(
                Effect.flatMap((map) => {
                  map.delete(RequestId);
                  return Ref.set(PendingRequests, map);
                }),
                Effect.runSync
              );
              resume(
                Effect.fail(
                  new StdioError({
                    cause: `Request ${RequestId} timed out`,
                    context: "RequestTimeout"
                  })
                )
              );
            }, TimeoutMs);
            Ref.update(
              PendingRequests,
              (map) => (map.set(RequestId, {
                Resume: resume,
                Timeout: TimeoutHandle
              }), map)
            ).pipe(Effect.runSync);
            process.stdout.write(
              JSON.stringify(RequestPayload) + "\n"
            );
          })
        );
      }), "SendRequest"),
      SendNotification: /* @__PURE__ */ __name((Method, Parameters) => Effect.sync(() => {
        const NotificationPayload = {
          type: "notification",
          method: Method,
          params: Parameters
        };
        process.stdout.write(
          JSON.stringify(NotificationPayload) + "\n"
        );
      }), "SendNotification"),
      // Stubs for other Ipc.Service methods not implemented by this adapter
      SendCancel: /* @__PURE__ */ __name(() => Effect.unit, "SendCancel"),
      CreateProtocolAdapter: /* @__PURE__ */ __name(() => {
        throw new Error(
          "RPCProtocol over Stdio is not supported in this adapter."
        );
      }, "CreateProtocolAdapter"),
      RegisterInvokeHandler: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "RegisterInvokeHandler")
    });
  })
);
export {
  Live
};
//# sourceMappingURL=mod.js.map
