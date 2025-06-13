var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Client } from "./Client/Service.js";
import { Dispatcher } from "./Dispatcher/Service.js";
import { IPCError } from "./Error.js";
import { GenericNotification, GenericRequest } from "./Generated.js";
import { ProtocolAdapter } from "./ProtocolAdapter/Service.js";
import { DecodeValue, EncodeValue } from "./ProtoConverter.js";
const Definition = Effect.gen(function* (_) {
  const ClientService = yield* _(Client.Tag);
  const DispatcherService = yield* _(Dispatcher.Tag);
  const AdapterService = yield* _(ProtocolAdapter.Tag);
  const RequestIDCounter = yield* _(Ref.make(1));
  const SendRequest = /* @__PURE__ */ __name((Method, Parameters, _TimeoutMilliseconds) => Effect.gen(function* (_2) {
    const RequestID = yield* _2(
      Ref.getAndUpdate(RequestIDCounter, (n) => n + 1)
    );
    const EncodedParameter = yield* _2(EncodeValue(Parameters));
    const RequestMessage = new GenericRequest();
    RequestMessage.setRequestid(RequestID);
    RequestMessage.setMethod(Method);
    RequestMessage.setParams(EncodedParameter);
    const ResponseMessage = yield* _2(
      Effect.tryPromise({
        try: /* @__PURE__ */ __name(() => ClientService.processCocoonRequest(RequestMessage), "try"),
        catch: /* @__PURE__ */ __name((Cause) => new IPCError({
          cause: Cause,
          context: `gRPC request '${Method}' failed.`
        }), "catch")
      })
    );
    const DecodedResult = yield* _2(
      DecodeValue(ResponseMessage.getResult())
    );
    return DecodedResult;
  }), "SendRequest");
  const SendNotification = /* @__PURE__ */ __name((Method, Parameters) => Effect.gen(function* (_2) {
    const EncodedParameter = yield* _2(EncodeValue(Parameters));
    const NotificationMessage = new GenericNotification();
    NotificationMessage.setMethod(Method);
    NotificationMessage.setParams(EncodedParameter);
    yield* _2(
      Effect.tryPromise({
        try: /* @__PURE__ */ __name(() => ClientService.sendCocoonNotification(
          NotificationMessage
        ), "try"),
        catch: /* @__PURE__ */ __name((Cause) => new IPCError({
          cause: Cause,
          context: `gRPC notification '${Method}' failed.`
        }), "catch")
      })
    );
  }).pipe(Effect.asUnit), "SendNotification");
  const ServiceImplementation = {
    SendRequest,
    SendNotification,
    // Delegate these methods directly to the specialized sub-services.
    SendCancel: DispatcherService.CancelOperation,
    CreateProtocolAdapter: /* @__PURE__ */ __name(() => AdapterService, "CreateProtocolAdapter"),
    RegisterInvokeHandler: DispatcherService.RegisterInvokeHandler
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
