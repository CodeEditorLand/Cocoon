var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as gRPC from "@grpc/grpc-js";
import * as ProtoLoader from "@grpc/proto-loader";
import { Effect, Ref } from "effect";
import * as Path from "node:path";
import { RPCProtocol } from "vs/workbench/services/extensions/common/rpcProtocol.js";
import { VSBuffer } from "vs/base/common/buffer.js";
import { Emitter } from "vs/base/common/event.js";
import { CancellationService } from "./Cancellation.js";
import { IPCConfigurationService } from "./IPCConfiguration.js";
import { gRPCConnectionError } from "./IPC/gRPCConnectionError.js";
import { IPCProblem } from "./IPC/IPCProblem.js";
import {
  GenericRequest,
  GenericResponse,
  GenericNotification,
  RPCDataPayload
} from "./IPC/Generated.js";
import { ProtoSerializationProblem } from "./IPC/ProtoConverter/ProtoSerializationProblem.js";
import { EncodeValue } from "./IPC/ProtoConverter/EncodeValue.js";
import { DecodeValue } from "./IPC/ProtoConverter/DecodeValue.js";
class IPCService extends Effect.Service()("Service/IPC", {
  scoped: Effect.gen(function* () {
    const Config = yield* IPCConfigurationService;
    const Cancellation = yield* CancellationService;
    const GrpcClient = yield* Effect.acquireRelease(
      Effect.gen(function* () {
        const ProtoPath = Path.join(
          process.cwd(),
          "proto/vine.ipc.proto"
        );
        const Definition = yield* Effect.tryPromise({
          try: /* @__PURE__ */ __name(() => ProtoLoader.load(ProtoPath, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
          }), "try"),
          catch: /* @__PURE__ */ __name((Cause) => new gRPCConnectionError({
            Cause,
            Context: "ProtoLoadFailed"
          }), "catch")
        });
        const GrpcObject = gRPC.loadPackageDefinition(Definition);
        const ClientConstructor = GrpcObject["vine_ipc"]["MountainService"];
        const Client = new ClientConstructor(
          Config.MountainAddress,
          gRPC.credentials.createInsecure()
        );
        yield* Effect.async((Resume) => {
          Client.waitForReady(
            Date.now() + 1e4,
            (Error2) => {
              if (Error2)
                Resume(
                  Effect.fail(
                    new gRPCConnectionError({
                      Cause: Error2,
                      Context: "ClientNotReady"
                    })
                  )
                );
              else Resume(Effect.void);
            }
          );
        });
        yield* Effect.logInfo(
          `gRPC client connected to Mountain at ${Config.MountainAddress}.`
        );
        return Client;
      }),
      (Client) => Effect.sync(() => Client.close()).pipe(
        Effect.tap(
          () => Effect.logInfo("gRPC client connection closed.")
        )
      )
    );
    const RequestIdCounter = yield* Ref.make(1);
    const OnMessageEmitter = new Emitter();
    const InvokeHandlersRef = yield* Ref.make(
      /* @__PURE__ */ new Map()
    );
    const SendRPCData = /* @__PURE__ */ __name((Buffer2) => Effect.tryPromise({
      try: /* @__PURE__ */ __name(() => {
        const Payload = new RPCDataPayload();
        Payload.setBuffer(Buffer2.buffer);
        return GrpcClient.sendRPCDataToMountain(Payload);
      }, "try"),
      catch: /* @__PURE__ */ __name((Cause) => new IPCProblem({
        Cause,
        Context: "sendRPCDataToMountain failed"
      }), "catch")
    }).pipe(
      Effect.catchAll(
        (Error2) => Effect.logError("Failed to send RPC data via gRPC", Error2)
      ),
      Effect.asVoid
    ), "SendRPCData");
    const ProtocolAdapter = {
      send: /* @__PURE__ */ __name((Buffer2) => Effect.runFork(SendRPCData(Buffer2)), "send"),
      onMessage: OnMessageEmitter.event
    };
    const RPCProtocolInstance = new RPCProtocol(ProtocolAdapter);
    const ServiceImplementation = {
      SendRequest: /* @__PURE__ */ __name((Method, Parameters) => Effect.gen(function* () {
        const RequestId = yield* Ref.getAndUpdate(
          RequestIdCounter,
          (n) => n + 1
        );
        const EncodedParameter = yield* EncodeValue(Parameters);
        const RequestMessage = new GenericRequest();
        RequestMessage.setRequestid(RequestId);
        RequestMessage.setMethod(Method);
        RequestMessage.setParams(EncodedParameter);
        const ResponseMessage = yield* Effect.tryPromise({
          try: /* @__PURE__ */ __name(() => GrpcClient.processCocoonRequest(RequestMessage), "try"),
          catch: /* @__PURE__ */ __name((Cause) => new IPCProblem({
            Cause,
            Context: `gRPC request '${Method}' failed.`
          }), "catch")
        });
        const DecodedResult = yield* DecodeValue(
          ResponseMessage.getResult()
        );
        return DecodedResult;
      }).pipe(
        Effect.mapError(
          (Error2) => Error2 instanceof ProtoSerializationProblem ? new IPCProblem({
            Cause: Error2,
            Context: "Proto serialization/deserialization failed"
          }) : Error2
        )
      ), "SendRequest"),
      SendNotification: /* @__PURE__ */ __name((Method, Parameters) => Effect.gen(function* () {
        const EncodedParameter = yield* EncodeValue(Parameters);
        const NotificationMessage = new GenericNotification();
        NotificationMessage.setMethod(Method);
        NotificationMessage.setParams(EncodedParameter);
        yield* Effect.tryPromise({
          try: /* @__PURE__ */ __name(() => GrpcClient.sendCocoonNotification(
            NotificationMessage
          ), "try"),
          catch: /* @__PURE__ */ __name((Cause) => new IPCProblem({
            Cause,
            Context: `gRPC notification '${Method}' failed.`
          }), "catch")
        });
      }).pipe(
        Effect.mapError(
          (Error2) => Error2 instanceof ProtoSerializationProblem ? new IPCProblem({
            Cause: Error2,
            Context: "Proto serialization/deserialization failed"
          }) : Error2
        ),
        Effect.asVoid
      ), "SendNotification"),
      SendCancel: Cancellation.CancelToken,
      CreateProtocolAdapter: /* @__PURE__ */ __name(() => ({
        send: ProtocolAdapter.send,
        onMessage: ProtocolAdapter.onMessage,
        ...RPCProtocolInstance,
        ProcessIncomingData: /* @__PURE__ */ __name((Data) => Effect.sync(
          () => OnMessageEmitter.fire(VSBuffer.wrap(Data))
        ), "ProcessIncomingData")
      }), "CreateProtocolAdapter"),
      CreateProxy: /* @__PURE__ */ __name((Channel) => {
        return new Proxy({}, {
          get(_Target, Property) {
            if (typeof Property === "string" && Property.startsWith("$")) {
              return (...Arguments) => {
                const Method = `${Channel}/${Property}`;
                return Effect.runPromise(
                  ServiceImplementation.SendRequest(
                    Method,
                    Arguments
                  )
                );
              };
            }
            return _Target[Property];
          }
        });
      }, "CreateProxy"),
      RegisterInvokeHandler: /* @__PURE__ */ __name((Channel, Handler) => {
        Effect.runSync(
          Ref.update(
            InvokeHandlersRef,
            (Map2) => Map2.set(Channel, Handler)
          )
        );
        return {
          dispose: /* @__PURE__ */ __name(() => {
            Effect.runFork(
              Ref.update(
                InvokeHandlersRef,
                (Map2) => (Map2.delete(Channel), Map2)
              )
            );
          }, "dispose")
        };
      }, "RegisterInvokeHandler")
    };
    return ServiceImplementation;
  })
}) {
  static {
    __name(this, "IPCService");
  }
}
export {
  IPCService
};
//# sourceMappingURL=IPC.js.map
