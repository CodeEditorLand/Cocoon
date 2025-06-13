var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Path from "node:path";
import * as gRPC from "@grpc/grpc-js";
import { loadPackageDefinition } from "@grpc/proto-loader";
import { Effect } from "effect";
import { Configuration } from "../Configuration.js";
import { Dispatcher } from "../Dispatcher/Service.js";
import { gRPCConnectionError } from "../Error.js";
import { CreateServiceImplementation } from "./CreateServiceImplementation.js";
import { Release } from "./Release.js";
function LoadProtoDefinition(ProtoPath) {
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
}
__name(LoadProtoDefinition, "LoadProtoDefinition");
function StartServer(Server, ServerAddress) {
  return Effect.async((Resume) => {
    Server.bindAsync(
      ServerAddress,
      gRPC.ServerCredentials.createInsecure(),
      (Error2, _port) => {
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
            Resume(Effect.succeed(void 0));
          } catch (e) {
            Resume(
              Effect.fail(
                new gRPCConnectionError({
                  Cause: e,
                  Context: "ServerStartFailed"
                })
              )
            );
          }
        }
      }
    );
  });
}
__name(StartServer, "StartServer");
const Acquire = Effect.acquireRelease(
  Effect.gen(function* (_) {
    const Config = yield* _(Configuration.Tag);
    const DispatcherService = yield* _(Dispatcher.Tag);
    const ProtoPath = Path.join(process.cwd(), "proto/vine.proto");
    const Definition = yield* _(LoadProtoDefinition(ProtoPath));
    const Proto = gRPC.loadPackageDefinition(Definition).vine_ipc;
    const ServiceDefinition = Proto.CocoonService.service;
    const Server = new gRPC.Server();
    const Implementation = CreateServiceImplementation(DispatcherService);
    Server.addService(ServiceDefinition, Implementation);
    yield* _(StartServer(Server, Config.CocoonAddress));
    yield* _(
      Effect.logInfo(
        `Cocoon gRPC server listening at ${Config.CocoonAddress}.`
      )
    );
    return Server;
  }),
  (Server) => Release(Server)
);
export {
  Acquire
};
//# sourceMappingURL=Acquire.js.map
