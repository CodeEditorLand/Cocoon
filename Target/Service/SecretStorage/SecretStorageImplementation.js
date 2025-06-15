var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Stream } from "effect";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import { EmptyKeyError, InvalidValueError } from "./Error.js";
class SecretStorageImplementation_default {
  constructor(ExtensionID, IPC, Log) {
    this.ExtensionID = ExtensionID;
    this.IPC = IPC;
    this.Log = Log;
    this.onDidChange = Stream.toEvent(this.OnDidChangeEvent.Stream);
  }
  static {
    __name(this, "default");
  }
  OnDidChangeEvent = CreateEventStream();
  onDidChange;
  CreateGetEffect(Key) {
    return Effect.gen(this, function* () {
      if (!Key) {
        return yield* new EmptyKeyError();
      }
      return yield* this.IPC.SendRequest(
        "$getPassword",
        [this.ExtensionID, Key]
      );
    }).pipe(
      Effect.catchTag("EmptyKeyError", (Error2) => Effect.fail(Error2)),
      Effect.catchAll(
        (Error2) => this.Log.Error(
          `SecretStorage.get failed for key '${Key}' in ext '${this.ExtensionID}'.`,
          Error2
        ).pipe(Effect.flatMap(() => Effect.fail(Error2)))
      )
    );
  }
  CreateStoreEffect(Key, Value) {
    return Effect.gen(this, function* () {
      if (!Key) {
        return yield* new EmptyKeyError();
      }
      if (typeof Value !== "string") {
        return yield* new InvalidValueError();
      }
      yield* this.IPC.SendNotification("$setPassword", [
        this.ExtensionID,
        Key,
        Value
      ]);
      yield* this.OnDidChangeEvent.Fire({ key: Key });
    }).pipe(
      Effect.catchAll(
        (Error2) => this.Log.Error(
          `SecretStorage.store failed for key '${Key}' in ext '${this.ExtensionID}'.`,
          Error2
        ).pipe(Effect.flatMap(() => Effect.fail(Error2)))
      )
    );
  }
  CreateDeleteEffect(Key) {
    return Effect.gen(this, function* () {
      if (!Key) {
        return yield* new EmptyKeyError();
      }
      yield* this.IPC.SendNotification("$deletePassword", [
        this.ExtensionID,
        Key
      ]);
      yield* this.OnDidChangeEvent.Fire({ key: Key });
    }).pipe(
      Effect.catchAll(
        (Error2) => this.Log.Error(
          `SecretStorage.delete failed for key '${Key}' in ext '${this.ExtensionID}'.`,
          Error2
        ).pipe(Effect.flatMap(() => Effect.fail(Error2)))
      )
    );
  }
  get = /* @__PURE__ */ __name((Key) => Effect.runPromise(this.CreateGetEffect(Key)), "get");
  store = /* @__PURE__ */ __name((Key, Value) => Effect.runPromise(this.CreateStoreEffect(Key, Value)), "store");
  delete = /* @__PURE__ */ __name((Key) => Effect.runPromise(this.CreateDeleteEffect(Key)), "delete");
}
export {
  SecretStorageImplementation_default as default
};
//# sourceMappingURL=SecretStorageImplementation.js.map
