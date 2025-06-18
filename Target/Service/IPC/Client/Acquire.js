var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Path from "node:path";
import * as GRPC from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { Effect } from "effect";
import IPCConfigurationService from "../Configuration.js";
import gRPCConnectionError from "../Error/gRPCConnectionError.js";
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
    catch: /* @__PURE__ */ __name((Cause) => new gRPCConnectionError({
      Cause,
      Context: "ProtoLoadFailed"
    }), "catch")
  });
}, "LoadProtoDefinition");
const CreateClientInstance = /* @__PURE__ */ __name((PackageDefinition, ServerAddress) => {
  return Effect.try({
    try: /* @__PURE__ */ __name(() => {
      const Proto = PackageDefinition["vine_ipc"];
      const ClientConstructor = Proto["MountainService"];
      return new ClientConstructor(
        ServerAddress,
        GRPC.credentials.createInsecure()
      );
    }, "try"),
    catch: /* @__PURE__ */ __name((Cause) => new gRPCConnectionError({
      Cause,
      Context: "ClientInstantiationFailed"
    }), "catch")
  });
}, "CreateClientInstance");
const WaitForClientReady = /* @__PURE__ */ __name((Client) => {
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
        Resume(Effect.void);
      }
    });
  });
}, "WaitForClientReady");
var Acquire_default = Effect.acquireRelease(
  Effect.gen(function* () {
    const Configuration = yield* IPCConfigurationService;
    const ProtoPath = Path.join(process.cwd(), "proto/vine.proto");
    const Definition = yield* LoadProtoDefinition(ProtoPath);
    const GrpcObject = GRPC.loadPackageDefinition(Definition);
    const Client = yield* CreateClientInstance(
      GrpcObject,
      Configuration.MountainAddress
    );
    yield* WaitForClientReady(Client);
    yield* Effect.logInfo(
      `gRPC client connected to Mountain at ${Configuration.MountainAddress}.`
    );
    return Client;
  }),
  (Client) => Release(Client)
);
export {
  Acquire_default as default
};
//# sourceMappingURL=Acquire.js.map
