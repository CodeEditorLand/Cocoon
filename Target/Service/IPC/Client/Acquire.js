var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Path from "node:path";
import * as gRPC from "@grpc/grpc-js";
import {
  loadPackageDefinition
} from "@grpc/proto-loader";
import { Effect } from "effect";
import { Configuration } from "../Configuration.js";
import { gRPCConnectionError } from "../Error.js";
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
function CreateClientInstance(PackageDefinition, ServerAddress) {
  return Effect.try({
    try: /* @__PURE__ */ __name(() => {
      const Proto = gRPC.loadPackageDefinition(PackageDefinition).vine_ipc;
      const ClientConstructor = Proto.MountainService;
      return new ClientConstructor(
        ServerAddress,
        gRPC.credentials.createInsecure()
      );
    }, "try"),
    catch: /* @__PURE__ */ __name((Cause) => new gRPCConnectionError({
      Cause,
      Context: "ClientInstantiationFailed"
    }), "catch")
  });
}
__name(CreateClientInstance, "CreateClientInstance");
function WaitForClientReady(Client) {
  return Effect.async((Resume) => {
    Client.waitForReady(Date.now() + 1e4, (Error2) => {
      if (Error2) {
        Resume(
          Effect.fail(
            new gRPCConnectionError({
              Cause: Error2,
              Context: "ClientNotReady"
            })
          )
        );
      } else {
        Resume(Effect.succeed(void 0));
      }
    });
  });
}
__name(WaitForClientReady, "WaitForClientReady");
const Acquire = Effect.acquireRelease(
  Effect.gen(function* (_) {
    const Config = yield* _(Configuration.Tag);
    const ProtoPath = Path.join(process.cwd(), "proto/vine.proto");
    const Definition = yield* _(LoadProtoDefinition(ProtoPath));
    const Client = yield* _(
      CreateClientInstance(Definition, Config.MountainAddress)
    );
    yield* _(WaitForClientReady(Client));
    yield* _(
      Effect.logInfo(
        `gRPC client connected to Mountain at ${Config.MountainAddress}.`
      )
    );
    return Client;
  }),
  (Client) => Release(Client)
);
export {
  Acquire
};
//# sourceMappingURL=Acquire.js.map
