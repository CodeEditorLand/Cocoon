var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Path from "node:path";
import * as GRPC from "@grpc/grpc-js";
import {
  loadPackageDefinition
} from "@grpc/proto-loader";
import { Effect } from "effect";
import ConfigurationService from "../Configuration.js";
import DispatcherService from "../Dispatcher/Service.js";
import { gRPCConnectionError } from "../Error.js";
import CreateServiceImplementation from "./CreateServiceImplementation.js";
import Release from "./Release.js";
const LoadProtoDefinition = /* @__PURE__ */ __name((ProtoPath) => {
  return Effect.tryPromise({
    try: /* @__PURE__ */ __name(() => loadPackageDefinition({
      path: ProtoPath,
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    }), "try"),
    catch: /* @__PURE__ */ __name((Cause) => new gRPCConnectionError({ Cause, Context: "ProtoLoadFailed" }), "catch")
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
    const Config = yield* ConfigurationService;
    const Dispatcher = yield* DispatcherService;
    const ProtoPath = Path.join(process.cwd(), "proto/vine.proto");
    const Definition = yield* LoadProtoDefinition(ProtoPath);
    const Proto = gRPC.loadPackageDefinition(Definition).vine_ipc;
    const ServiceDefinition = Proto.CocoonService.service;
    const Server = new GRPC.Server();
    const Implementation = CreateServiceImplementation(Dispatcher);
    Server.addService(ServiceDefinition, Implementation);
    yield* StartServer(Server, Config.CocoonAddress);
    yield* Effect.logInfo(
      `Cocoon gRPC server listening at ${Config.CocoonAddress}.`
    );
    return Server;
  }),
  (Server) => Release(Server).pipe(Effect.orDie)
);
export {
  Acquire_default as default
};
//# sourceMappingURL=Acquire.js.map
