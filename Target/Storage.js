var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Emitter } from "@codeeditorland/output/vs/base/common/event.js";
import { Effect, Ref, Schedule } from "effect";
import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";
const DebounceMilliseconds = 1e3;
class MementoProxyImplementation {
  constructor(StateRef, MarkAsDirty) {
    this.StateRef = StateRef;
    this.MarkAsDirty = MarkAsDirty;
  }
  static {
    __name(this, "MementoProxyImplementation");
  }
  OnDidChangeEmitter = new Emitter();
  onDidChange = this.OnDidChangeEmitter.event;
  get(key, defaultValue) {
    const State = Effect.runSync(Ref.get(this.StateRef));
    const Value = State[key];
    return Value !== void 0 ? Value : defaultValue;
  }
  keys() {
    const State = Effect.runSync(Ref.get(this.StateRef));
    return Object.keys(State);
  }
  update(key, value) {
    const UpdateEffect = Ref.update(this.StateRef, (CurrentState) => {
      const NewState = { ...CurrentState };
      if (value === void 0) {
        delete NewState[key];
      } else {
        NewState[key] = value;
      }
      return NewState;
    }).pipe(
      Effect.tap(
        () => Effect.sync(
          () => this.OnDidChangeEmitter.fire({ keys: [key] })
        )
      ),
      Effect.tap(() => Effect.sync(this.MarkAsDirty)),
      Effect.asVoid
    );
    return Effect.runPromise(UpdateEffect);
  }
  get whenReady() {
    return Promise.resolve();
  }
}
class StorageService extends Effect.Service()(
  "Service/Storage",
  {
    scoped: Effect.gen(function* () {
      const IPC = yield* IPCService;
      const Logger = yield* LoggerService;
      const [InitialGlobalStorage, InitialWorkspaceStorage] = yield* Effect.all([
        IPC.SendRequest("$storage:getAll", [
          true
        ]),
        IPC.SendRequest("$storage:getAll", [
          false
        ])
      ]);
      const GlobalStorageRef = yield* Ref.make(InitialGlobalStorage);
      const WorkspaceStorageRef = yield* Ref.make(
        InitialWorkspaceStorage
      );
      const IsGlobalDirty = yield* Ref.make(false);
      const IsWorkspaceDirty = yield* Ref.make(false);
      const PersistChanges = Effect.gen(function* () {
        const [IsGlobalDirtyValue, IsWorkspaceDirtyValue] = yield* Effect.all([
          Ref.get(IsGlobalDirty),
          Ref.get(IsWorkspaceDirty)
        ]);
        const PersistenceEffects = [];
        if (IsGlobalDirtyValue) {
          const CurrentState = yield* Ref.get(GlobalStorageRef);
          PersistenceEffects.push(
            IPC.SendNotification("$storage:setAll", [
              true,
              CurrentState
            ])
          );
          yield* Ref.set(IsGlobalDirty, false);
        }
        if (IsWorkspaceDirtyValue) {
          const CurrentState = yield* Ref.get(WorkspaceStorageRef);
          PersistenceEffects.push(
            IPC.SendNotification("$storage:setAll", [
              false,
              CurrentState
            ])
          );
          yield* Ref.set(IsWorkspaceDirty, false);
        }
        if (PersistenceEffects.length > 0) {
          yield* Logger.Debug("Persisting Memento state to host...");
          yield* Effect.all(PersistenceEffects, {
            discard: true,
            concurrency: "unbounded"
          });
        }
      }).pipe(
        Effect.catchAll(
          (Error2) => Logger.Error("Failed to persist Memento state.", Error2)
        )
      );
      yield* Effect.forkDaemon(
        PersistChanges.pipe(
          Effect.repeat(
            Schedule.spaced(`${DebounceMilliseconds} millis`)
          )
        )
      );
      const CreateMemento = /* @__PURE__ */ __name((ExtensionId, IsGlobal) => {
        const RootStateRef = IsGlobal ? GlobalStorageRef : WorkspaceStorageRef;
        const RootState = Effect.runSync(Ref.get(RootStateRef));
        const ExtensionState = RootState[ExtensionId] ?? {};
        const ExtensionStateRef = Effect.runSync(
          Ref.make(ExtensionState)
        );
        const MarkAsDirtyCallback = /* @__PURE__ */ __name(() => {
          const UpdateEffect = Effect.gen(function* () {
            const DirtyFlagRef = IsGlobal ? IsGlobalDirty : IsWorkspaceDirty;
            yield* Ref.set(DirtyFlagRef, true);
            const extensionStateValue = yield* Ref.get(ExtensionStateRef);
            yield* Ref.update(RootStateRef, (CurrentRoot) => ({
              ...CurrentRoot,
              [ExtensionId]: extensionStateValue
            }));
          });
          Effect.runFork(UpdateEffect);
        }, "MarkAsDirtyCallback");
        return new MementoProxyImplementation(
          ExtensionStateRef,
          MarkAsDirtyCallback
        );
      }, "CreateMemento");
      return { CreateMemento };
    }).pipe(Effect.orDie)
  }
) {
  static {
    __name(this, "StorageService");
  }
}
export {
  StorageService
};
//# sourceMappingURL=Storage.js.map
