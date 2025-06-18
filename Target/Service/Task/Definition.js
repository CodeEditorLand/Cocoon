var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Disposable } from "vscode";
import { Task as TaskConverter } from "../../TypeConverter/Task.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import CancellationService from "../Cancellation/Service.js";
import IPCService from "../IPC/Service.js";
import ProvideTasksEffect from "./RPCHandlers/ProvideTasks.js";
let HandleCounter = 0;
var Definition_default = Effect.gen(function* (G) {
  const IPC = yield* G(IPCService);
  const Cancellation = yield* G(CancellationService);
  const TaskProvidersRef = yield* G(Ref.make(/* @__PURE__ */ new Map()));
  IPC.RegisterInvokeHandler(
    "$provideTasks",
    ([Handle, TokenID]) => Effect.runPromise(
      ProvideTasksEffect(TaskProvidersRef, Handle, TokenID, Cancellation)
    )
  );
  const OnDidStartTaskEvent = CreateEventStream();
  const OnDidEndTaskEvent = CreateEventStream();
  const OnDidStartTaskProcessEvent = CreateEventStream();
  const OnDidEndTaskProcessEvent = CreateEventStream();
  const TaskImplementation = {
    onDidStartTask: OnDidStartTaskEvent.event,
    onDidEndTask: OnDidEndTaskEvent.event,
    onDidStartTaskProcess: OnDidStartTaskProcessEvent.event,
    onDidEndTaskProcess: OnDidEndTaskProcessEvent.event,
    taskExecutions: [],
    RegisterTaskProvider: /* @__PURE__ */ __name((Type, Provider, Extension) => Effect.sync(() => {
      const Handle = ++HandleCounter;
      Effect.runSync(
        Ref.update(
          TaskProvidersRef,
          (Map2) => Map2.set(Handle, { Type, Provider, Extension })
        )
      );
      Effect.runFork(
        IPC.SendNotification("$registerTaskProvider", [
          Handle,
          Type
        ])
      );
      return new Disposable(() => {
        const CleanupEffect = Ref.update(
          TaskProvidersRef,
          (Map2) => (Map2.delete(Handle), Map2)
        ).pipe(
          Effect.flatMap(
            () => IPC.SendNotification("$unregisterTaskProvider", [
              Handle
            ])
          )
        );
        Effect.runFork(CleanupEffect);
      });
    }), "RegisterTaskProvider"),
    FetchTasks: /* @__PURE__ */ __name((Filter) => IPC.SendRequest("$fetchTasks", [Filter]).pipe(
      Effect.map(
        (DTOs) => DTOs.map((DTO) => TaskConverter.ToAPI(DTO))
      ),
      Effect.mapError((cause) => new Error(String(cause)))
    ), "FetchTasks"),
    ExecuteTask: /* @__PURE__ */ __name((TaskToExecute, Extension) => IPC.SendRequest("$executeTask", [
      TaskConverter.FromAPI(TaskToExecute, Extension)
    ]).pipe(
      Effect.map(
        (DTO) => TaskConverter.Execution.ToAPI(DTO, TaskToExecute)
      ),
      Effect.mapError((cause) => new Error(String(cause)))
    ), "ExecuteTask")
  };
  return TaskImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
