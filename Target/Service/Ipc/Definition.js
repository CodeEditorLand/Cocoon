var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import ClientService from "./Client/Service.js";
import DispatcherService from "./Dispatcher/Service.js";
import IPCError from "./Error/IPCError.js";
import Generated from "./Generated.js";
import ProtocolAdapterService from "./ProtocolAdapter/Service.js";
import DecodeValue from "./ProtoConverter/DecodeValue.js";
import EncodeValue from "./ProtoConverter/EncodeValue.js";
import ProtoSerializationError from "./ProtoConverter/Error/ProtoSerializationError.js";
var Definition_default = Effect.gen(function* () {
  const Client = yield* ClientService;
  const Dispatcher = yield* DispatcherService;
  const ProtocolAdapter = yield* ProtocolAdapterService;
  const RequestIDCounter = yield* Ref.make(1);
  const SendRequest = /* @__PURE__ */ __name((Method, Parameters, _TimeoutMilliseconds) => Effect.gen(function* () {
    const RequestID = yield* Ref.getAndUpdate(
      RequestIDCounter,
      (n) => n + 1
    );
    const EncodedParameter = yield* EncodeValue(Parameters);
    const RequestMessage = new Generated.GenericRequest();
    RequestMessage.setRequestid(RequestID);
    RequestMessage.setMethod(Method);
    RequestMessage.setParams(EncodedParameter);
    const ResponseMessage = yield* Effect.tryPromise({
      try: /* @__PURE__ */ __name(() => Client.processCocoonRequest(RequestMessage), "try"),
      catch: /* @__PURE__ */ __name((cause) => new IPCError({
        cause,
        context: `gRPC request '${Method}' failed.`
      }), "catch")
    });
    const DecodedResult = yield* DecodeValue(
      ResponseMessage.getResult()
    );
    return DecodedResult;
  }).pipe(
    Effect.mapError((error) => {
      if (error instanceof ProtoSerializationError) {
        return new IPCError({
          cause: error,
          context: "Proto serialization/deserialization failed"
        });
      }
      return error;
    })
  ), "SendRequest");
  const SendNotification = /* @__PURE__ */ __name((Method, Parameters) => Effect.gen(function* () {
    const EncodedParameter = yield* EncodeValue(Parameters);
    const NotificationMessage = new Generated.GenericNotification();
    NotificationMessage.setMethod(Method);
    NotificationMessage.setParams(EncodedParameter);
    yield* Effect.tryPromise({
      try: /* @__PURE__ */ __name(() => Client.sendCocoonNotification(NotificationMessage), "try"),
      catch: /* @__PURE__ */ __name((cause) => new IPCError({
        cause,
        context: `gRPC notification '${Method}' failed.`
      }), "catch")
    });
  }).pipe(
    Effect.mapError((error) => {
      if (error instanceof ProtoSerializationError) {
        return new IPCError({
          cause: error,
          context: "Proto serialization/deserialization failed"
        });
      }
      return error;
    }),
    Effect.asVoid
  ), "SendNotification");
  const CreateProxy = /* @__PURE__ */ __name((Channel) => {
    return new Proxy({}, {
      get(_target, prop) {
        if (typeof prop === "string" && prop.startsWith("$")) {
          return (...args) => {
            const method = `${Channel}/${prop}`;
            return Effect.runPromise(SendRequest(method, args));
          };
        }
        return _target[prop];
      }
    });
  }, "CreateProxy");
  const IPCImplementation = {
    SendRequest,
    SendNotification,
    SendCancel: Dispatcher.CancelOperation,
    CreateProtocolAdapter: /* @__PURE__ */ __name(() => ProtocolAdapter, "CreateProtocolAdapter"),
    CreateProxy,
    RegisterInvokeHandler: Dispatcher.RegisterInvokeHandler
  };
  return IPCImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
