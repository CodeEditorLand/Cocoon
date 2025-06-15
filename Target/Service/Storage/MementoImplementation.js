var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref, Stream } from "effect";
import CreateEventStream from "../../Utility/CreateEventStream.js";
class MementoImplementation_default {
  constructor(ExtensionID, IsGlobal, IPC, Log, InitialValue) {
    this.ExtensionID = ExtensionID;
    this.IPC = IPC;
    this.Log = Log;
    this.Scope = IsGlobal ? 0 /* GLOBAL */ : 1 /* WORKSPACE */;
    this.onDidChange = Stream.toEvent(this.OnDidChangeEvent.Stream);
    this.ValueRef = Ref.unsafeMake(InitialValue);
  }
  static {
    __name(this, "default");
  }
  OnDidChangeEvent = CreateEventStream();
  onDidChange;
  Scope;
  ValueRef;
  get(Key, DefaultValue) {
    const State = Effect.runSync(Ref.get(this.ValueRef));
    let Value = State?.[Key];
    if (typeof Value === "undefined") {
      Value = DefaultValue;
    }
    return Value;
  }
  update(Key, Value) {
    const UpdateEffect = this.IPC.SendNotification("$setValue", [
      this.Scope,
      Key,
      Value
    ]).pipe(
      Effect.tap(
        () => Ref.update(this.ValueRef, (Current) => ({
          ...Current,
          [Key]: Value
        }))
      ),
      Effect.tap(() => this.OnDidChangeEvent.Fire({ keys: [Key] })),
      Effect.catchAll(
        (Error2) => this.Log.Error(
          `Memento.update('${Key}') failed for ext '${this.ExtensionID}'.`,
          Error2
        )
      ),
      Effect.asVoid
    );
    return Effect.runPromise(UpdateEffect);
  }
  keys(_Options) {
    const State = Effect.runSync(Ref.get(this.ValueRef));
    return Object.keys(State || {});
  }
  get whenReady() {
    return Promise.resolve();
  }
  /**
   * Internal method to accept state updates from the host.
   */
  acceptValue(Value) {
    const OldValue = Effect.runSync(Ref.get(this.ValueRef));
    Effect.runSync(Ref.set(this.ValueRef, Value));
    const OldKeys = Object.keys(OldValue || {});
    const NewKeys = Object.keys(Value || {});
    const ChangedKeys = /* @__PURE__ */ new Set([...OldKeys, ...NewKeys]);
    this.OnDidChangeEvent.Fire({ keys: Array.from(ChangedKeys) });
  }
}
export {
  MementoImplementation_default as default
};
//# sourceMappingURL=MementoImplementation.js.map
