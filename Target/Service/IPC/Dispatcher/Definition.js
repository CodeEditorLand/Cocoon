var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { RPCProtocol } from "vs/workbench/services/extensions/common/rpcProtocol.js";
import { Cancellation } from "../../Cancellation.js";
import { ProtocolAdapter } from "../ProtocolAdapter.js";
const Definition = Effect.gen(function* (_) {
  const ProtocolAdapterService = yield* _(ProtocolAdapter.Tag);
  const CancellationService = yield* _(Cancellation.Tag);
  const RPCProtocolInstance = new RPCProtocol(ProtocolAdapterService);
  const InvokeHandlers = yield* _(Ref.make(/* @__PURE__ */ new Map()));
  const DispatchRequest = /* @__PURE__ */ __name((Method, Parameters) => Effect.gen(function* (_2) {
    const handlers = yield* _2(Ref.get(InvokeHandlers));
    const customHandler = handlers.get(Method);
    if (customHandler) {
      return yield* _2(
        Effect.tryPromise(() => customHandler(...Parameters))
      );
    } else {
      if (RPCProtocolInstance._getHandler) {
        const handler = RPCProtocolInstance._getHandler(
          Method
        );
        if (handler) {
          return yield* _2(
            Effect.tryPromise(() => handler(...Parameters))
          );
        }
      }
      return yield* _2(
        Effect.fail(
          new Error(`No handler found for RPC method: ${Method}`)
        )
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
  const ServiceImplementation = {
    DispatchRequest,
    DispatchNotification,
    CancelOperation: CancellationService.CancelToken,
    ProcessIncomingData: ProtocolAdapterService.ProcessIncomingData,
    RegisterInvokeHandler: /* @__PURE__ */ __name((Channel, Handler) => {
      const registerEffect = Ref.update(
        InvokeHandlers,
        (map) => map.set(Channel, Handler)
      );
      Effect.runSync(registerEffect);
      return {
        dispose: /* @__PURE__ */ __name(() => {
          const unregisterEffect = Ref.update(
            InvokeHandlers,
            (map) => (map.delete(Channel), map)
          );
          Effect.runFork(unregisterEffect);
        }, "dispose")
      };
    }, "RegisterInvokeHandler")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
