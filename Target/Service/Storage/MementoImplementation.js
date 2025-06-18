var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import CreateEventStream from "../../Utility/CreateEventStream.js";
class MementoImplementation {
  constructor(ExtensionID, IsGlobal, InitialValue, IPC, Log) {
    this.ExtensionID = ExtensionID;
    this.IPC = IPC;
    this.Log = Log;
    this.Scope = IsGlobal ? 0 /* GLOBAL */ : 1 /* WORKSPACE */;
    this.onDidChange = this.OnDidChangeEventStream.event;
    this.ValueRef = Ref.unsafeMake(InitialValue);
  }
  static {
    __name(this, "MementoImplementation");
  }
  OnDidChangeEventStream = CreateEventStream();
  onDidChange;
  Scope;
  ValueRef;
  CreateUpdateEffect(Key, Value) {
    return Effect.gen(this, function* (G) {
      yield* G(
        this.IPC.SendNotification("$setValue", [
          this.Scope,
          this.ExtensionID,
          Key,
          Value
        ])
      );
      yield* G(
        Ref.update(this.ValueRef, (Current) => ({
          ...Current || {},
          [Key]: Value
        }))
      );
      yield* G(this.OnDidChangeEventStream.Fire({ keys: [Key] }));
    }).pipe(
      Effect.catchAll(
        (Error2) => this.Log.Error(
          `Memento.update('${Key}') failed for ext '${this.ExtensionID}'.`,
          Error2
        )
      ),
      Effect.asVoid
    );
  }
  get(Key, DefaultValue) {
    const State = Effect.runSync(Ref.get(this.ValueRef));
    const Value = State?.[Key];
    return Value !== void 0 ? Value : DefaultValue;
  }
  update(Key, Value) {
    return Effect.runPromise(this.CreateUpdateEffect(Key, Value));
  }
  keys(_Options) {
    const State = Effect.runSync(Ref.get(this.ValueRef));
    return Object.keys(State || {});
  }
  get whenReady() {
    return Promise.resolve();
  }
  acceptValue(Value) {
    const OldValue = Effect.runSync(Ref.get(this.ValueRef));
    Effect.runSync(Ref.set(this.ValueRef, Value));
    const OldKeys = Object.keys(OldValue || {});
    const NewKeys = Object.keys(Value || {});
    const ChangedKeys = [.../* @__PURE__ */ new Set([...OldKeys, ...NewKeys])];
    this.OnDidChangeEventStream.Fire({ keys: ChangedKeys });
  }
}
export {
  MementoImplementation as default
};
//# sourceMappingURL=MementoImplementation.js.map
