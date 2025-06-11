var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Path from "path";
import * as Grpc from "@grpc/grpc-js";
import {
  GrpcObject,
  loadPackageDefinition,
  ServiceClientConstructor
} from "@grpc/proto-loader";
import { Effect } from "effect";
import { ConfigTag } from "../Config.js";
import { GrpcConnectionError } from "../Error.js";
import { Release } from "./Release.js";
const LoadProtoDefinition = /* @__PURE__ */ __name((ProtoPath) => Effect.tryPromise({
  try: /* @__PURE__ */ __name(() => loadPackageDefinition(ProtoPath), "try"),
  catch: /* @__PURE__ */ __name((Cause) => new GrpcConnectionError({ Cause, context: "ProtoLoadFailed" }), "catch")
}), "LoadProtoDefinition");
const CreateClientInstance = /* @__PURE__ */ __name((PackageDefinition, ServerAddress) => Effect.try({
  try: /* @__PURE__ */ __name(() => {
    const Proto = Grpc.loadPackageDefinition(PackageDefinition).vine_ipc;
    const ClientConstructor = Proto.MountainService;
    return new ClientConstructor(
      ServerAddress,
      Grpc.credentials.createInsecure()
    );
  }, "try"),
  catch: /* @__PURE__ */ __name((Cause) => new GrpcConnectionError({
    Cause,
    context: "ClientInstantiationFailed"
  }), "catch")
}), "CreateClientInstance");
const WaitForClientReady = /* @__PURE__ */ __name((Client) => Effect.async((Resume) => {
  Client.waitForReady(Date.now() + 1e4, (Error2) => {
    if (Error2) {
      Resume(
        Effect.fail(
          new GrpcConnectionError({
            Cause: Error2,
            context: "ClientNotReady"
          })
        )
      );
    } else {
      Resume(Effect.succeed(void 0));
    }
  });
}), "WaitForClientReady");
const Acquire = Effect.acquireRelease(
  Effect.gen(function* (_) {
    const Config = yield* _(ConfigTag);
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
