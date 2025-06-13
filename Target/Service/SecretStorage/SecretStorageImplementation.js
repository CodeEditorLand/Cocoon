var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Stream } from "effect";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { EmptyKeyError, InvalidValueError } from "./Error.js";
class SecretStorageImplementation {
  constructor(ExtensionID, IPCService, LogService) {
    this.ExtensionID = ExtensionID;
    this.IPCService = IPCService;
    this.LogService = LogService;
    this.onDidChange = this.OnDidChangeEvent.Stream.pipe(Stream.toEvent);
  }
  static {
    __name(this, "SecretStorageImplementation");
  }
  OnDidChangeEvent = CreateEventStream();
  onDidChange;
  createGetEffect(Key) {
    return Effect.gen(this, function* (_) {
      if (!Key) {
        return yield* _(Effect.fail(new EmptyKeyError()));
      }
      const result = yield* _(
        this.IPCService.SendRequest(
          "$getPassword",
          [this.ExtensionID, Key]
        )
      );
      return result;
    }).pipe(
      Effect.catchTag("EmptyKeyError", (e) => Effect.fail(e)),
      Effect.catchAll(
        (err) => this.LogService.Error(
          `SecretStorage.get failed for key '${Key}' in ext '${this.ExtensionID}'.`,
          err
        ).pipe(Effect.flatMap(() => Effect.fail(err)))
      )
    );
  }
  createStoreEffect(Key, Value) {
    return Effect.gen(this, function* (_) {
      if (!Key) {
        return yield* _(Effect.fail(new EmptyKeyError()));
      }
      if (typeof Value !== "string") {
        return yield* _(Effect.fail(new InvalidValueError()));
      }
      yield* _(
        this.IPCService.SendNotification("$setPassword", [
          this.ExtensionID,
          Key,
          Value
        ])
      );
      yield* _(this.OnDidChangeEvent.Fire({ key: Key }));
    }).pipe(
      Effect.catchAll(
        (err) => this.LogService.Error(
          `SecretStorage.store failed for key '${Key}' in ext '${this.ExtensionID}'.`,
          err
        ).pipe(Effect.flatMap(() => Effect.fail(err)))
      )
    );
  }
  createDeleteEffect(Key) {
    return Effect.gen(this, function* (_) {
      if (!Key) {
        return yield* _(Effect.fail(new EmptyKeyError()));
      }
      yield* _(
        this.IPCService.SendNotification("$deletePassword", [
          this.ExtensionID,
          Key
        ])
      );
      yield* _(this.OnDidChangeEvent.Fire({ key: Key }));
    }).pipe(
      Effect.catchAll(
        (err) => this.LogService.Error(
          `SecretStorage.delete failed for key '${Key}' in ext '${this.ExtensionID}'.`,
          err
        ).pipe(Effect.flatMap(() => Effect.fail(err)))
      )
    );
  }
  get = /* @__PURE__ */ __name((key) => Effect.runPromise(this.createGetEffect(key)), "get");
  store = /* @__PURE__ */ __name((key, value) => Effect.runPromise(this.createStoreEffect(key, value)), "store");
  delete = /* @__PURE__ */ __name((key) => Effect.runPromise(this.createDeleteEffect(key)), "delete");
}
export {
  SecretStorageImplementation
};
//# sourceMappingURL=SecretStorageImplementation.js.map
