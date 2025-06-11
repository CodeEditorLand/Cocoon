var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Grpc from "@grpc/grpc-js";
import { Effect } from "effect";
import {} from "../Dispatcher/Service.js";
import {
  CancelOperationRequest,
  Empty,
  GenericNotification,
  GenericRequest,
  GenericResponse,
  RpcDataPayload
} from "../Generated/mod.js";
import { DecodeValue, EncodeValue } from "../ProtoConverter/mod.js";
const CreateServiceImplementation = /* @__PURE__ */ __name((DispatcherService) => ({
  /**
   * Handles generic request/response calls from `Mountain`.
   */
  processMountainRequest: /* @__PURE__ */ __name((call, callback) => {
    const Request = call.request;
    const RequestId = Request.getRequestid();
    const ProcessEffect = Effect.gen(function* (_) {
      const DecodedParameter = yield* _(DecodeValue(Request.getParams()));
      const Result = yield* _(
        DispatcherService.DispatchRequest(
          Request.getMethod(),
          DecodedParameter
        )
      );
      const EncodedResult = yield* _(EncodeValue(Result));
      const Response = new GenericResponse();
      Response.setRequestid(RequestId);
      Response.setResult(EncodedResult);
      return Response;
    });
    Effect.runCallback(ProcessEffect, (Exit) => {
      if (Exit.isSuccess()) {
        callback(null, Exit.value);
      } else {
        const RpcError = {
          code: Grpc.status.INTERNAL,
          message: "Effect failed"
        };
        callback(RpcError, null);
      }
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
      ),
      Effect.as(new Empty())
    );
    Effect.runCallback(ProcessEffect, () => callback(null, new Empty()));
  }, "sendMountainNotification"),
  /**
   * Handles incoming raw binary data for the `RPCProtocol` adapter.
   */
  sendRpcDataToCocoon: /* @__PURE__ */ __name((call, callback) => {
    const Payload = call.request;
    const ProcessEffect = DispatcherService.ProcessIncomingData(
      Payload.getBuffer_asU8()
    );
    Effect.runCallback(ProcessEffect, () => callback(null, new Empty()));
  }, "sendRpcDataToCocoon"),
  /**
   * Handles cancellation requests from `Mountain`.
   */
  cancelCocoonOperation: /* @__PURE__ */ __name((call, callback) => {
    const Request = call.request;
    const ProcessEffect = DispatcherService.CancelOperation(
      Request.getRequestidtocancel()
    );
    Effect.runCallback(ProcessEffect, () => callback(null, new Empty()));
  }, "cancelCocoonOperation")
}), "CreateServiceImplementation");
export {
  CreateServiceImplementation
};
//# sourceMappingURL=CreateServiceImplementation.js.map
