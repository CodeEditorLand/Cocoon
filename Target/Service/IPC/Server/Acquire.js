var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Path from "node:path";
import * as GRPC from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { Effect } from "effect";
import IPCConfigurationService from "../Configuration.js";
import DispatcherService from "../Dispatcher/Service.js";
import gRPCConnectionError from "../Error/gRPCConnectionError.js";
import CreateServiceImplementation from "./CreateServiceImplementation.js";
import Release from "./Release.js";
const LoadProtoDefinition = /* @__PURE__ */ __name((ProtoPath) => {
  return Effect.tryPromise({
    try: /* @__PURE__ */ __name(() => protoLoader.load(ProtoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    }), "try"),
    catch: /* @__PURE__ */ __name((cause) => new gRPCConnectionError({
      Cause: cause,
      Context: "ProtoLoadFailed"
    }), "catch")
  });
}, "LoadProtoDefinition");
const StartServer = /* @__PURE__ */ __name((Server, ServerAddress) => {
  return Effect.async((Resume) => {
    Server.bindAsync(
      ServerAddress,
      GRPC.ServerCredentials.createInsecure(),
      (Error2, _Port) => {
        if (Error2) {
          Resume(
            Effect.fail(
              new gRPCConnectionError({
                Cause: Error2,
                Context: "ServerBindFailed"
              })
            )
          );
        } else {
          try {
            Server.start();
            Resume(Effect.void);
          } catch (CaughtError) {
            Resume(
              Effect.fail(
                new gRPCConnectionError({
                  Cause: CaughtError,
                  Context: "ServerStartFailed"
                })
              )
            );
          }
        }
      }
    );
  });
}, "StartServer");
var Acquire_default = Effect.acquireRelease(
  Effect.gen(function* () {
    const Configuration = yield* IPCConfigurationService;
    const Dispatcher = yield* DispatcherService;
    const ProtoPath = Path.join(process.cwd(), "proto/vine.proto");
    const Definition = yield* LoadProtoDefinition(ProtoPath);
    const Proto = GRPC.loadPackageDefinition(Definition)["vine_ipc"];
    const ServiceDefinition = Proto["CocoonService"]["service"];
    const Server = new GRPC.Server();
    const Implementation = CreateServiceImplementation(Dispatcher);
    Server.addService(ServiceDefinition, Implementation);
    yield* StartServer(Server, Configuration.CocoonAddress);
    yield* Effect.logInfo(
      `Cocoon gRPC server listening at ${Configuration.CocoonAddress}.`
    );
    return Server;
  }),
  (Server) => Release(Server).pipe(Effect.orDie)
);
export {
  Acquire_default as default
};
//# sourceMappingURL=Acquire.js.map
