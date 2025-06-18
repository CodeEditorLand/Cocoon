var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import EmptyKeyError from "./Error/EmptyKeyError.js";
import InvalidValueError from "./Error/InvalidValueError.js";
class SecretStorageImplementation {
  constructor(ExtensionID, IPC, Log) {
    this.ExtensionID = ExtensionID;
    this.IPC = IPC;
    this.Log = Log;
    this.onDidChange = this.OnDidChangeEventStream.event;
  }
  static {
    __name(this, "SecretStorageImplementation");
  }
  OnDidChangeEventStream = CreateEventStream();
  onDidChange;
  CreateGetEffect(Key) {
    return Effect.gen(this, function* (G) {
      if (!Key) {
        return yield* G(new EmptyKeyError());
      }
      return yield* G(
        this.IPC.SendRequest("$getPassword", [
          this.ExtensionID,
          Key
        ])
      );
    }).pipe(
      Effect.catchTag(
        "IPCError",
        (Error2) => this.Log.Error(
          `SecretStorage.get failed for key '${Key}' in ext '${this.ExtensionID}'.`,
          Error2
        ).pipe(Effect.flatMap(() => Effect.succeed(void 0)))
      )
    );
  }
  CreateStoreEffect(Key, Value) {
    return Effect.gen(this, function* (G) {
      if (!Key) {
        return yield* G(new EmptyKeyError());
      }
      if (typeof Value !== "string") {
        return yield* G(new InvalidValueError());
      }
      yield* G(
        this.IPC.SendNotification("$setPassword", [
          this.ExtensionID,
          Key,
          Value
        ])
      );
      yield* G(this.OnDidChangeEventStream.Fire({ key: Key }));
    }).pipe(
      Effect.catchAll(
        (Error2) => this.Log.Error(
          `SecretStorage.store failed for key '${Key}' in ext '${this.ExtensionID}'.`,
          Error2
        ).pipe(Effect.flatMap(() => Effect.void))
      )
    );
  }
  CreateDeleteEffect(Key) {
    return Effect.gen(this, function* (G) {
      if (!Key) {
        return yield* G(new EmptyKeyError());
      }
      yield* G(
        this.IPC.SendNotification("$deletePassword", [
          this.ExtensionID,
          Key
        ])
      );
      yield* G(this.OnDidChangeEventStream.Fire({ key: Key }));
    }).pipe(
      Effect.catchAll(
        (Error2) => this.Log.Error(
          `SecretStorage.delete failed for key '${Key}' in ext '${this.ExtensionID}'.`,
          Error2
        ).pipe(Effect.flatMap(() => Effect.void))
      )
    );
  }
  get = /* @__PURE__ */ __name((Key) => Effect.runPromise(this.CreateGetEffect(Key)), "get");
  store = /* @__PURE__ */ __name((Key, Value) => Effect.runPromise(this.CreateStoreEffect(Key, Value)), "store");
  delete = /* @__PURE__ */ __name((Key) => Effect.runPromise(this.CreateDeleteEffect(Key)), "delete");
}
export {
  SecretStorageImplementation as default
};
//# sourceMappingURL=SecretStorageImplementation.js.map
