var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Disposable } from "vscode";
import { Task as TaskConverter } from "../../TypeConverter.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import ProvideTasks from "./RPCHandlers/ProvideTasks.js";
let HandleCounter = 0;
var Definition_default = Effect.gen(function* () {
  const IPC = yield* IPCService;
  const TaskProviders = yield* Ref.make(/* @__PURE__ */ new Map());
  yield* IPC.RegisterInvokeHandler(
    "$provideTasks",
    ([Handle, TokenID]) => Effect.runPromise(ProvideTasks(TaskProviders, Handle, TokenID))
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
          TaskProviders,
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
          TaskProviders,
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
      )
    ), "FetchTasks"),
    ExecuteTask: /* @__PURE__ */ __name((TaskToExecute, Extension) => IPC.SendRequest("$executeTask", [
      TaskConverter.FromAPI(TaskToExecute, Extension)
    ]).pipe(
      Effect.map(
        (DTO) => TaskConverter.Execution.ToAPI(DTO, TaskToExecute)
      )
    ), "ExecuteTask")
  };
  return TaskImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
