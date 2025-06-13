var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref, Stream } from "effect";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
class MementoImplementation {
  constructor(ExtensionID, IsGlobal, IPCService, LogService, InitialValue) {
    this.ExtensionID = ExtensionID;
    this.IPCService = IPCService;
    this.LogService = LogService;
    this.Scope = IsGlobal ? 0 /* GLOBAL */ : 1 /* WORKSPACE */;
    this.onDidChange = this.OnDidChangeEvent.Stream.pipe(Stream.toEvent);
    this._value = Ref.unsafeMake(InitialValue);
  }
  static {
    __name(this, "MementoImplementation");
  }
  OnDidChangeEvent = CreateEventStream();
  onDidChange;
  Scope;
  _value;
  get(key, defaultValue) {
    const state = Ref.get(this._value).pipe(Effect.runSync);
    let value = state?.[key];
    if (typeof value === "undefined") {
      value = defaultValue;
    }
    return value;
  }
  update(key, value) {
    const updateEffect = this.IPCService.SendNotification("$setValue", [
      this.Scope,
      key,
      value
    ]).pipe(
      Effect.tap(
        () => Ref.update(this._value, (current) => ({
          ...current,
          [key]: value
        }))
      ),
      Effect.tap(() => this.OnDidChangeEvent.Fire({ keys: [key] })),
      Effect.catchAll(
        (err) => this.LogService.Error(
          `Memento.update('${key}') failed for ext '${this.ExtensionID}'.`,
          err
        )
      )
    );
    return Effect.runPromise(updateEffect);
  }
  keys(options) {
    const state = Ref.get(this._value).pipe(Effect.runSync);
    return Object.keys(state || {});
  }
  get whenReady() {
    return Promise.resolve();
  }
  /**
   * Internal method to accept state updates from the host.
   */
  acceptValue(value) {
    const oldValue = Ref.get(this._value).pipe(Effect.runSync);
    Ref.set(this._value, value).pipe(Effect.runSync);
    const oldKeys = Object.keys(oldValue || {});
    const newKeys = Object.keys(value || {});
    const changedKeys = /* @__PURE__ */ new Set([...oldKeys, ...newKeys]);
    this.OnDidChangeEvent.Fire({ keys: Array.from(changedKeys) });
  }
}
export {
  MementoImplementation
};
//# sourceMappingURL=MementoImplementation.js.map
