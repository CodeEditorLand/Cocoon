var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { VSBuffer } from "vs/base/common/buffer.js";
import { Emitter } from "vs/base/common/event.js";
import { Client } from "../Client.js";
import { IPCError } from "../Error.js";
import { RPCDataPayload } from "../Generated.js";
const Definition = Effect.gen(function* (_) {
  const ClientService = yield* _(Client.Tag);
  const OnMessageEmitter = new Emitter();
  const OnDidDisposeEmitter = new Emitter();
  const Send = /* @__PURE__ */ __name((Buffer2) => Effect.tryPromise({
    try: /* @__PURE__ */ __name(() => {
      const Payload = new RPCDataPayload();
      Payload.setBuffer(Buffer2.buffer);
      return ClientService.sendRPCDataToMountain(Payload);
    }, "try"),
    catch: /* @__PURE__ */ __name((Cause) => new IPCError({
      cause: Cause,
      context: "sendRPCDataToMountain failed"
    }), "catch")
  }).pipe(
    Effect.catchAll(
      (Error2) => Effect.logError("Failed to send RPC data via gRPC", Error2)
    ),
    Effect.asUnit
  ), "Send");
  const ServiceImplementation = {
    /**
     * The `send` method must be synchronous according to the VS Code API.
     * Therefore, we fork the `Send` Effect to run in the background without
     * blocking the caller.
     */
    send: /* @__PURE__ */ __name((Buffer2) => {
      Effect.runFork(Send(Buffer2));
    }, "send"),
    onMessage: OnMessageEmitter.event,
    onDidDispose: OnDidDisposeEmitter.event,
    /**
     * An `Effect` that processes incoming raw data from `Mountain` by
     * firing the `onMessage` event.
     */
    ProcessIncomingData: /* @__PURE__ */ __name((Data) => Effect.sync(() => {
      OnMessageEmitter.fire(VSBuffer.wrap(Data));
    }), "ProcessIncomingData")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
