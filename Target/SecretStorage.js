var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { CreateEventStream } from "./Utility/CreateEventStream.js";
import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";
class EmptyKeyError extends Error {
  static {
    __name(this, "EmptyKeyError");
  }
  constructor() {
    super("Secret key cannot be empty.");
  }
}
class InvalidValueError extends Error {
  static {
    __name(this, "InvalidValueError");
  }
  constructor() {
    super("Secret value must be a string.");
  }
}
class SecretStorageImplementation {
  constructor(ExtensionId, IPC, Logger) {
    this.ExtensionId = ExtensionId;
    this.IPC = IPC;
    this.Logger = Logger;
    this.onDidChange = this.OnDidChangeEventStream.event;
  }
  static {
    __name(this, "SecretStorageImplementation");
  }
  OnDidChangeEventStream = CreateEventStream();
  onDidChange;
  Get(Key) {
    if (!Key) return Effect.fail(new EmptyKeyError());
    return Effect.gen(this, function* () {
      return yield* this.IPC.SendRequest(
        "$getPassword",
        [this.ExtensionId, Key]
      );
    }).pipe(
      Effect.catchAll(
        (Error2) => this.Logger.Error(
          `SecretStorage.get failed for key '${Key}' in ext '${this.ExtensionId}'.`,
          Error2
        ).pipe(Effect.flatMap(() => Effect.succeed(void 0)))
      )
    );
  }
  Store(Key, Value) {
    if (!Key) return Effect.fail(new EmptyKeyError());
    if (typeof Value !== "string")
      return Effect.fail(new InvalidValueError());
    return Effect.gen(this, function* () {
      yield* this.IPC.SendNotification("$setPassword", [
        this.ExtensionId,
        Key,
        Value
      ]);
      yield* this.OnDidChangeEventStream.Fire({ key: Key });
    }).pipe(
      Effect.catchAll(
        (Error2) => this.Logger.Error(
          `SecretStorage.store failed for key '${Key}' in ext '${this.ExtensionId}'.`,
          Error2
        ).pipe(Effect.flatMap(() => Effect.void))
      )
    );
  }
  Delete(Key) {
    if (!Key) return Effect.fail(new EmptyKeyError());
    return Effect.gen(this, function* () {
      yield* this.IPC.SendNotification("$deletePassword", [
        this.ExtensionId,
        Key
      ]);
      yield* this.OnDidChangeEventStream.Fire({ key: Key });
    }).pipe(
      Effect.catchAll(
        (Error2) => this.Logger.Error(
          `SecretStorage.delete failed for key '${Key}' in ext '${this.ExtensionId}'.`,
          Error2
        ).pipe(Effect.flatMap(() => Effect.void))
      )
    );
  }
  get = /* @__PURE__ */ __name((Key) => Effect.runPromise(this.Get(Key)), "get");
  store = /* @__PURE__ */ __name((Key, Value) => Effect.runPromise(this.Store(Key, Value)), "store");
  delete = /* @__PURE__ */ __name((Key) => Effect.runPromise(this.Delete(Key)), "delete");
}
class SecretStorageService extends Effect.Service()(
  "Service/SecretStorage",
  {
    effect: Effect.gen(function* () {
      const IPC = yield* IPCService;
      const Logger = yield* LoggerService;
      return {
        CreateStorage: /* @__PURE__ */ __name((ExtensionId) => {
          Effect.runSync(
            Logger.Debug(
              `Created SecretStorage for extension: '${ExtensionId}'`
            )
          );
          return new SecretStorageImplementation(
            ExtensionId,
            IPC,
            Logger
          );
        }, "CreateStorage")
      };
    })
  }
) {
  static {
    __name(this, "SecretStorageService");
  }
}
export {
  SecretStorageService
};
//# sourceMappingURL=SecretStorage.js.map
