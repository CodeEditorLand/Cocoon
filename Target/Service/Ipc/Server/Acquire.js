var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Path from "path";
import * as Grpc from "@grpc/grpc-js";
import { GrpcObject, loadPackageDefinition } from "@grpc/proto-loader";
import { Effect } from "effect";
import { ConfigTag } from "../Config.js";
import { Tag as DispatcherTag } from "../Dispatcher/Service.js";
import { GrpcConnectionError } from "../Error.js";
import { CreateServiceImplementation } from "./CreateServiceImplementation.js";
import { Release } from "./Release.js";
const LoadProtoDefinition = /* @__PURE__ */ __name((ProtoPath) => Effect.tryPromise({
  try: /* @__PURE__ */ __name(() => loadPackageDefinition(ProtoPath), "try"),
  catch: /* @__PURE__ */ __name((Cause) => new GrpcConnectionError({ Cause, context: "ProtoLoadFailed" }), "catch")
}), "LoadProtoDefinition");
const StartServer = /* @__PURE__ */ __name((Server, ServerAddress) => Effect.async((Resume) => {
  Server.bindAsync(
    ServerAddress,
    Grpc.ServerCredentials.createInsecure(),
    (Error2, _port) => {
      if (Error2) {
        Resume(
          Effect.fail(
            new GrpcConnectionError({
              Cause: Error2,
              context: "ServerBindFailed"
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
              new GrpcConnectionError({
                Cause: e,
                context: "ServerStartFailed"
              })
            )
          );
        }
      }
    }
  );
}), "StartServer");
const Acquire = Effect.acquireRelease(
  Effect.gen(function* (_) {
    const Config = yield* _(ConfigTag);
    const Dispatcher = yield* _(DispatcherTag);
    const ProtoPath = Path.join(process.cwd(), "proto/vine.proto");
    const Definition = yield* _(LoadProtoDefinition(ProtoPath));
    const Proto = Grpc.loadPackageDefinition(Definition).vine_ipc;
    const ServiceDefinition = Proto.CocoonService.service;
    const Server = new Grpc.Server();
    const Implementation = CreateServiceImplementation(Dispatcher);
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
