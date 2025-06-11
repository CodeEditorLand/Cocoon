var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Stream } from "effect";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IpcProvider } from "../Ipc/mod.js";
import { LogProvider } from "../Log.js";
import { EmptyKeyError, InvalidValueError } from "./Error.js";
class SecretStorageImpl {
  constructor(ExtensionId, Ipc, Log) {
    this.ExtensionId = ExtensionId;
    this.Ipc = Ipc;
    this.Log = Log;
    this.onDidChange = this.OnDidChangeEvent.Stream.pipe(Stream.toEvent);
  }
  static {
    __name(this, "SecretStorageImpl");
  }
  OnDidChangeEvent = CreateEventStream();
  onDidChange;
  createGetEffect = /* @__PURE__ */ __name((Key) => Effect.gen(this, function* (_) {
    if (!Key) return yield* _(Effect.fail(new EmptyKeyError()));
    const result = yield* _(
      this.Ipc.SendRequest("$getPassword", [
        this.ExtensionId,
        Key
      ])
    );
    return result === null ? void 0 : result;
  }).pipe(
    Effect.catchTag("EmptyKeyError", (e) => Effect.fail(e)),
    Effect.catchAll(
      (err) => this.Log.Error(
        `SecretStorage.get failed for key '${Key}' in ext '${this.ExtensionId}'.`,
        err
      ).pipe(Effect.flatMap(() => Effect.fail(err)))
    )
  ), "createGetEffect");
  createStoreEffect = /* @__PURE__ */ __name((Key, Value) => Effect.gen(this, function* (_) {
    if (!Key) return yield* _(Effect.fail(new EmptyKeyError()));
    if (typeof Value !== "string")
      return yield* _(Effect.fail(new InvalidValueError()));
    yield* _(
      this.Ipc.SendNotification("$setPassword", [
        this.ExtensionId,
        Key,
        Value
      ])
    );
    yield* _(this.OnDidChangeEvent.Fire({ key: Key }));
  }).pipe(
    Effect.catchAll(
      (err) => this.Log.Error(
        `SecretStorage.store failed for key '${Key}' in ext '${this.ExtensionId}'.`,
        err
      ).pipe(Effect.flatMap(() => Effect.fail(err)))
    )
  ), "createStoreEffect");
  createDeleteEffect = /* @__PURE__ */ __name((Key) => Effect.gen(this, function* (_) {
    if (!Key) return yield* _(Effect.fail(new EmptyKeyError()));
    yield* _(
      this.Ipc.SendNotification("$deletePassword", [
        this.ExtensionId,
        Key
      ])
    );
    yield* _(this.OnDidChangeEvent.Fire({ key: Key }));
  }).pipe(
    Effect.catchAll(
      (err) => this.Log.Error(
        `SecretStorage.delete failed for key '${Key}' in ext '${this.ExtensionId}'.`,
        err
      ).pipe(Effect.flatMap(() => Effect.fail(err)))
    )
  ), "createDeleteEffect");
  get = /* @__PURE__ */ __name((key) => Effect.runPromise(this.createGetEffect(key)), "get");
  store = /* @__PURE__ */ __name((key, value) => Effect.runPromise(this.createStoreEffect(key, value)), "store");
  delete = /* @__PURE__ */ __name((key) => Effect.runPromise(this.createDeleteEffect(key)), "delete");
}
export {
  SecretStorageImpl
};
//# sourceMappingURL=SecretStorageImpl.js.map
