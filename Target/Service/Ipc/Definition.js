var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { GenericNotification, GenericRequest } from "../Generated/mod.js";
import {
  Tag as ClientTag
} from "./Client/Service.js";
import {
  Tag as DispatcherTag
} from "./Dispatcher/Service.js";
import { IpcError } from "./Error.js";
import {
  Tag as AdapterTag
} from "./ProtocolAdapter/Service.js";
import { DecodeValue, EncodeValue } from "./ProtoConverter/mod.js";
const Definition = Effect.gen(function* (_) {
  const Client = yield* _(ClientTag);
  const Dispatcher = yield* _(DispatcherTag);
  const Adapter = yield* _(AdapterTag);
  const RequestIdCounter = yield* _(Ref.make(1));
  const SendRequestEffect = /* @__PURE__ */ __name((Method, Parameters, _TimeoutMilliseconds) => Effect.gen(function* (_2) {
    const RequestId = yield* _2(
      Ref.getAndUpdate(RequestIdCounter, (n) => n + 1)
    );
    const EncodedParameter = yield* _2(EncodeValue(Parameters));
    const RequestMessage = new GenericRequest();
    RequestMessage.setRequestid(RequestId);
    RequestMessage.setMethod(Method);
    RequestMessage.setParams(EncodedParameter);
    const ResponseMessage = yield* _2(
      Effect.tryPromise({
        try: /* @__PURE__ */ __name(() => Client.processCocoonRequest(RequestMessage), "try"),
        catch: /* @__PURE__ */ __name((Cause) => new IpcError({
          cause: Cause,
          context: `gRPC request '${Method}' failed.`
        }), "catch")
      })
    );
    const DecodedResult = yield* _2(
      DecodeValue(ResponseMessage.getResult())
    );
    return DecodedResult;
  }).pipe(Effect.mapError((e) => e)), "SendRequestEffect");
  const SendNotificationEffect = /* @__PURE__ */ __name((Method, Parameters) => Effect.gen(function* (_2) {
    const EncodedParameter = yield* _2(EncodeValue(Parameters));
    const NotificationMessage = new GenericNotification();
    NotificationMessage.setMethod(Method);
    NotificationMessage.setParams(EncodedParameter);
    yield* _2(
      Effect.tryPromise({
        try: /* @__PURE__ */ __name(() => Client.sendCocoonNotification(NotificationMessage), "try"),
        catch: /* @__PURE__ */ __name((Cause) => new IpcError({
          cause: Cause,
          context: `gRPC notification '${Method}' failed.`
        }), "catch")
      })
    );
  }).pipe(
    Effect.asUnit,
    Effect.mapError((e) => e)
  ), "SendNotificationEffect");
  const ServiceImplementation = {
    SendRequest: SendRequestEffect,
    SendNotification: SendNotificationEffect,
    // Delegate these methods directly to the specialized sub-services.
    SendCancel: Dispatcher.CancelOperation,
    CreateProtocolAdapter: /* @__PURE__ */ __name(() => Adapter, "CreateProtocolAdapter"),
    RegisterInvokeHandler: Dispatcher.RegisterInvokeHandler
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
