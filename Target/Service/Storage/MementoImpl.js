var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Stream } from "effect";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
class MementoImpl {
  constructor(ExtensionId, IsGlobal, IpcService, LogService) {
    this.ExtensionId = ExtensionId;
    this.IpcService = IpcService;
    this.LogService = LogService;
    this.Scope = IsGlobal ? 1 /* Application */ : 0 /* Profile */;
    this.onDidChange = this.OnDidChangeEvent.Stream.pipe(Stream.toEvent);
  }
  static {
    __name(this, "MementoImpl");
  }
  OnDidChangeEvent = CreateEventStream();
  onDidChange;
  Scope;
  createGetEffect = /* @__PURE__ */ __name((Key, DefaultValue) => this.IpcService.SendRequest("$getValue", {
    scope: this.Scope,
    key: Key
  }).pipe(
    Effect.map(
      (result) => result === void 0 || result === null ? DefaultValue : result
    ),
    Effect.catchAll((err) => {
      this.LogService.Error(
        `Memento.get('${Key}') failed for ext '${this.ExtensionId}'.`,
        err
      );
      return Effect.succeed(DefaultValue);
    })
  ), "createGetEffect");
  createUpdateEffect = /* @__PURE__ */ __name((Key, Value) => Effect.gen(this, function* (_) {
    const ValueForRpc = Value === void 0 ? null : Value;
    yield* _(
      this.IpcService.SendNotification("$setValue", {
        scope: this.Scope,
        key: Key,
        value: ValueForRpc
      })
    );
    yield* _(this.OnDidChangeEvent.Fire({ keys: [Key] }));
  }).pipe(
    Effect.catchAll(
      (err) => this.LogService.Error(
        `Memento.update('${Key}') failed for ext '${this.ExtensionId}'.`,
        err
      )
    )
  ), "createUpdateEffect");
  createKeysEffect = /* @__PURE__ */ __name((Options) => this.IpcService.SendRequest("$keys", {
    scope: this.Scope,
    options: Options
  }).pipe(
    Effect.map((result) => Object.freeze(result ?? [])),
    Effect.catchAll((err) => {
      this.LogService.Error(
        `Memento.keys() failed for ext '${this.ExtensionId}'.`,
        err
      );
      return Effect.succeed(Object.freeze([]));
    })
  ), "createKeysEffect");
  get = /* @__PURE__ */ __name((key, defaultValue) => {
    return Effect.runSync(this.createGetEffect(key, defaultValue));
  }, "get");
  update = /* @__PURE__ */ __name((key, value) => Effect.runPromise(this.createUpdateEffect(key, value)), "update");
  keys = /* @__PURE__ */ __name((options) => Effect.runSync(this.createKeysEffect(options)), "keys");
  get whenReady() {
    return Promise.resolve();
  }
}
export {
  MementoImpl
};
//# sourceMappingURL=MementoImpl.js.map
