var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as GRPC from "@grpc/grpc-js";
import { Effect } from "effect";
import Generated from "../Generated.js";
import DecodeValue from "../ProtoConverter/DecodeValue.js";
import EncodeValue from "../ProtoConverter/EncodeValue.js";
const CreateServiceImplementation = /* @__PURE__ */ __name((Dispatcher) => {
  return {
    /**
     * Handles generic request/response calls from `Mountain`.
     */
    processMountainRequest: /* @__PURE__ */ __name((Call, Callback) => {
      const Request = Call.request;
      const RequestID = Request.getRequestid();
      const ProcessEffect = Effect.gen(function* () {
        const DecodedParameter = yield* DecodeValue(
          Request.getParams()
        );
        const Result = yield* Dispatcher.DispatchRequest(
          Request.getMethod(),
          Array.isArray(DecodedParameter) ? DecodedParameter : []
        );
        const EncodedResult = yield* EncodeValue(Result);
        const Response = new Generated.GenericResponse();
        Response.setRequestid(RequestID);
        Response.setResult(EncodedResult);
        return Response;
      }).pipe(
        Effect.catchAll(
          (err) => Effect.fail(
            new Error("gRPC handler effect failed", { cause: err })
          )
        )
      );
      Effect.runPromiseExit(ProcessEffect).then((Exit) => {
        if (Exit._tag === "Success") {
          Callback(null, Exit.value);
        } else {
          const RPCError = {
            code: GRPC.status.INTERNAL,
            details: Exit.cause._tag === "Fail" ? String(Exit.cause.error) : "Unknown Effect Failure",
            metadata: new GRPC.Metadata(),
            name: "EffectFailure",
            message: "Effect failed to complete in gRPC handler."
          };
          Callback(RPCError, null);
        }
      });
    }, "processMountainRequest"),
    /**
     * Handles fire-and-forget notifications from `Mountain`.
     */
    sendMountainNotification: /* @__PURE__ */ __name((Call, Callback) => {
      const Notification = Call.request;
      const ProcessEffect = DecodeValue(Notification.getParams()).pipe(
        Effect.flatMap(
          (DecodedParameter) => Dispatcher.DispatchNotification(
            Notification.getMethod(),
            Array.isArray(DecodedParameter) ? DecodedParameter : []
          )
        )
      );
      Effect.runFork(ProcessEffect);
      Callback(null, new Generated.Empty());
    }, "sendMountainNotification"),
    /**
     * Handles incoming raw binary data for the `RPCProtocol` adapter.
     */
    sendRPCDataToCocoon: /* @__PURE__ */ __name((Call, Callback) => {
      const Payload = Call.request;
      const ProcessEffect = Dispatcher.ProcessIncomingData(
        Payload.getBuffer_asU8()
      );
      Effect.runFork(ProcessEffect);
      Callback(null, new Generated.Empty());
    }, "sendRPCDataToCocoon"),
    /**
     * Handles cancellation requests from `Mountain`.
     */
    cancelCocoonOperation: /* @__PURE__ */ __name((Call, Callback) => {
      const Request = Call.request;
      const ProcessEffect = Dispatcher.CancelOperation(
        Request.getRequestid()
      );
      Effect.runFork(ProcessEffect);
      Callback(null, new Generated.Empty());
    }, "cancelCocoonOperation")
  };
}, "CreateServiceImplementation");
var CreateServiceImplementation_default = CreateServiceImplementation;
export {
  CreateServiceImplementation_default as default
};
//# sourceMappingURL=CreateServiceImplementation.js.map
