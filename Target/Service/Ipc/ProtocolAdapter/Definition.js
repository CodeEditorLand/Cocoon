var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { VSBuffer } from "vs/base/common/buffer.js";
import { Emitter } from "vs/base/common/event.js";
import ClientService from "../Client/Service.js";
import IPCError from "../Error/IPCError.js";
import Generated from "../Generated.js";
var Definition_default = Effect.gen(function* () {
  const Client = yield* ClientService;
  const OnMessageEmitter = new Emitter();
  const Send = /* @__PURE__ */ __name((Buffer2) => Effect.tryPromise({
    try: /* @__PURE__ */ __name(() => {
      const Payload = new Generated.RPCDataPayload();
      Payload.setBuffer(Buffer2.buffer);
      return Client.sendRPCDataToMountain(Payload);
    }, "try"),
    catch: /* @__PURE__ */ __name((cause) => new IPCError({
      cause,
      context: "sendRPCDataToMountain failed"
    }), "catch")
  }).pipe(
    Effect.catchAll(
      (error) => Effect.logError("Failed to send RPC data via gRPC", error)
    ),
    Effect.asVoid
  ), "Send");
  const ProtocolAdapterImplementation = {
    /**
     * The `send` method must be synchronous according to the VS Code API.
     * Therefore, we fork the `Send` Effect to run in the background without
     * blocking the caller.
     */
    send: /* @__PURE__ */ __name((Buffer2) => {
      Effect.runFork(Send(Buffer2));
    }, "send"),
    onMessage: OnMessageEmitter.event,
    /**
     * An `Effect` that processes incoming raw data from `Mountain` by
     * firing the `onMessage` event.
     */
    ProcessIncomingData: /* @__PURE__ */ __name((Data) => Effect.sync(() => {
      OnMessageEmitter.fire(VSBuffer.wrap(Data));
    }), "ProcessIncomingData")
  };
  return ProtocolAdapterImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
