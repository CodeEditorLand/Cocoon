var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as gRPC from "@grpc/grpc-js";
import { Effect } from "effect";
import {
  Empty,
  GenericResponse
} from "../Generated.js";
import { DecodeValue, EncodeValue } from "../ProtoConverter.js";
function CreateServiceImplementation(DispatcherService) {
  return {
    /**
     * Handles generic request/response calls from `Mountain`.
     */
    processMountainRequest: /* @__PURE__ */ __name((call, callback) => {
      const Request = call.request;
      const RequestID = Request.getRequestid();
      const ProcessEffect = Effect.gen(function* (_) {
        const DecodedParameter = yield* _(
          DecodeValue(Request.getParams())
        );
        const Result = yield* _(
          DispatcherService.DispatchRequest(
            Request.getMethod(),
            DecodedParameter
          )
        );
        const EncodedResult = yield* _(EncodeValue(Result));
        const Response = new GenericResponse();
        Response.setRequestid(RequestID);
        Response.setResult(EncodedResult);
        return Response;
      });
      Effect.runCallback(ProcessEffect, {
        onSuccess: /* @__PURE__ */ __name((Response) => callback(null, Response), "onSuccess"),
        onFailure: /* @__PURE__ */ __name((cause) => {
          const RPCError = {
            code: gRPC.status.INTERNAL,
            details: cause._tag === "Fail" ? String(cause.error) : "Unknown Effect Failure",
            metadata: new gRPC.Metadata(),
            name: "EffectFailure",
            message: "Effect failed to complete in gRPC handler."
          };
          callback(RPCError, null);
        }, "onFailure")
      });
    }, "processMountainRequest"),
    /**
     * Handles fire-and-forget notifications from `Mountain`.
     */
    sendMountainNotification: /* @__PURE__ */ __name((call, callback) => {
      const Notification = call.request;
      const ProcessEffect = DecodeValue(Notification.getParams()).pipe(
        Effect.flatMap(
          (DecodedParameter) => DispatcherService.DispatchNotification(
            Notification.getMethod(),
            DecodedParameter
          )
        )
      );
      Effect.runFork(ProcessEffect);
      callback(null, new Empty());
    }, "sendMountainNotification"),
    /**
     * Handles incoming raw binary data for the `RPCProtocol` adapter.
     */
    sendRPCDataToCocoon: /* @__PURE__ */ __name((call, callback) => {
      const Payload = call.request;
      const ProcessEffect = DispatcherService.ProcessIncomingData(
        Payload.getBuffer_asU8()
      );
      Effect.runFork(ProcessEffect);
      callback(null, new Empty());
    }, "sendRPCDataToCocoon"),
    /**
     * Handles cancellation requests from `Mountain`.
     */
    cancelCocoonOperation: /* @__PURE__ */ __name((call, callback) => {
      const Request = call.request;
      const ProcessEffect = DispatcherService.CancelOperation(
        Request.getRequestidtocancel()
      );
      Effect.runFork(ProcessEffect);
      callback(null, new Empty());
    }, "cancelCocoonOperation")
  };
}
__name(CreateServiceImplementation, "CreateServiceImplementation");
export {
  CreateServiceImplementation
};
//# sourceMappingURL=CreateServiceImplementation.js.map
