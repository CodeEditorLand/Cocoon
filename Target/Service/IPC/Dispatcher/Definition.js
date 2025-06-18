var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { RPCProtocol } from "vs/workbench/services/extensions/common/rpcProtocol.js";
import CancellationService from "../../Cancellation/Service.js";
import ProtocolAdapterService from "../ProtocolAdapter/Service.js";
var Definition_default = Effect.gen(function* () {
  const ProtocolAdapter = yield* ProtocolAdapterService;
  const Cancellation = yield* CancellationService;
  const RPCProtocolInstance = new RPCProtocol(ProtocolAdapter);
  const InvokeHandlers = yield* Ref.make(/* @__PURE__ */ new Map());
  const DispatchRequest = /* @__PURE__ */ __name((Method, Parameters) => Effect.gen(function* () {
    const Handlers = yield* Ref.get(InvokeHandlers);
    const CustomHandler = Handlers.get(Method);
    if (CustomHandler) {
      return yield* Effect.tryPromise({
        try: /* @__PURE__ */ __name(() => CustomHandler(...Parameters), "try"),
        catch: /* @__PURE__ */ __name((e) => e, "catch")
      });
    } else {
      if (RPCProtocolInstance._getHandler) {
        const Handler = RPCProtocolInstance._getHandler(
          Method
        );
        if (Handler) {
          return yield* Effect.tryPromise({
            try: /* @__PURE__ */ __name(() => Handler(...Parameters), "try"),
            catch: /* @__PURE__ */ __name((e) => e, "catch")
          });
        }
      }
      return yield* Effect.fail(
        new Error(`No handler found for RPC method: ${Method}`)
      );
    }
  }), "DispatchRequest");
  const DispatchNotification = /* @__PURE__ */ __name((Method, Parameters) => Effect.sync(() => {
    if (RPCProtocolInstance._receiveNotification) {
      RPCProtocolInstance._receiveNotification(
        Method,
        Parameters
      );
    }
  }), "DispatchNotification");
  const DispatcherImplementation = {
    DispatchRequest,
    DispatchNotification,
    CancelOperation: Cancellation.CancelToken,
    ProcessIncomingData: ProtocolAdapter.ProcessIncomingData,
    RegisterInvokeHandler: /* @__PURE__ */ __name((Channel, Handler) => {
      const RegisterEffect = Ref.update(
        InvokeHandlers,
        (Map2) => Map2.set(Channel, Handler)
      );
      Effect.runSync(RegisterEffect);
      return {
        dispose: /* @__PURE__ */ __name(() => {
          const UnregisterEffect = Ref.update(
            InvokeHandlers,
            (Map2) => (Map2.delete(Channel), Map2)
          );
          Effect.runFork(UnregisterEffect);
        }, "dispose")
      };
    }, "RegisterInvokeHandler")
  };
  return DispatcherImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
