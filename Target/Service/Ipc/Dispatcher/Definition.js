var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { RPCProtocol } from "vs/workbench/services/extensions/common/rpcProtocol.js";
import { Tag as CancellationTokenTag } from "../../Cancellation/Service.js";
import { Tag as ProtocolAdapterTag } from "../ProtocolAdapter/Service.js";
const Definition = Effect.gen(function* (_) {
  const Adapter = yield* _(ProtocolAdapterTag);
  const Cancellation = yield* _(CancellationTokenTag);
  const RpcProtocolInstance = new RPCProtocol(Adapter);
  const InvokeHandlers = yield* _(Ref.make(/* @__PURE__ */ new Map()));
  const DispatchRequestEffect = /* @__PURE__ */ __name((Method, Parameters) => Effect.gen(function* (_2) {
    const handlers = yield* _2(Ref.get(InvokeHandlers));
    const customHandler = handlers.get(Method);
    if (customHandler) {
      return yield* _2(
        Effect.tryPromise(() => customHandler(...Parameters))
      );
    } else {
      return yield* _2(
        Effect.tryPromise(
          () => RpcProtocolInstance._receiveRequest(
            0,
            Method,
            Parameters
          )
          // ID is not used by VS Code's impl here
        )
      );
    }
  }), "DispatchRequestEffect");
  const DispatchNotificationEffect = /* @__PURE__ */ __name((Method, Parameters) => Effect.sync(() => {
    RpcProtocolInstance._receiveNotification(
      Method,
      Parameters
    );
  }), "DispatchNotificationEffect");
  const ServiceImplementation = {
    DispatchRequest: DispatchRequestEffect,
    DispatchNotification: DispatchNotificationEffect,
    CancelOperation: Cancellation.CancelToken,
    ProcessIncomingData: Adapter.ProcessIncomingData,
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
