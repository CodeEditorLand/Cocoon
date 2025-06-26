var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import {
  Disposable
} from "vscode";
import { CancellationService } from "./Cancellation.js";
import { IPCService } from "./IPC.js";
import {
  ExecutionToAPI,
  FromAPI as TaskFromAPI,
  ToAPI as TaskToAPI
} from "./TypeConverter/Task.js";
import { CreateEventStream } from "./Utility/CreateEventStream.js";
const ProvideTasks = /* @__PURE__ */ __name((Registry, Handle, TokenId, Cancellation) => {
  return Effect.gen(function* () {
    const Entry = (yield* Ref.get(Registry)).get(Handle);
    if (!Entry)
      return yield* Effect.fail(
        new Error(`Task provider with handle ${Handle} not found.`)
      );
    const Provider = Entry.Provider;
    if (!Provider.provideTasks) return [];
    const CancellationToken = yield* Cancellation.ObtainToken(TokenId);
    const Tasks = yield* Effect.tryPromise({
      try: /* @__PURE__ */ __name(() => Provider.provideTasks(CancellationToken), "try"),
      catch: /* @__PURE__ */ __name((CaughtError) => CaughtError, "catch")
    });
    if (!Tasks) return [];
    return Tasks.map(
      (TheTask) => TaskFromAPI(TheTask, Entry.Extension)
    );
  }).pipe(
    Effect.scoped,
    // Ensures the CancellationToken's scope is properly managed
    Effect.catchAll(() => Effect.succeed([]))
    // Gracefully return empty array on any error
  );
}, "ProvideTasks");
class TaskService extends Effect.Service()("Service/Task", {
  effect: Effect.gen(function* () {
    const IPC = yield* IPCService;
    const Cancellation = yield* CancellationService;
    let HandleCounter = 0;
    const TaskProvidersRef = yield* Ref.make(
      /* @__PURE__ */ new Map()
    );
    IPC.RegisterInvokeHandler(
      "$provideTasks",
      ([Handle, TokenId]) => Effect.runPromise(
        ProvideTasks(
          TaskProvidersRef,
          Handle,
          TokenId,
          Cancellation
        )
      )
    );
    const { event: OnDidStartTaskEvent } = CreateEventStream();
    const { event: OnDidEndTaskEvent } = CreateEventStream();
    const { event: OnDidStartTaskProcessEvent } = CreateEventStream();
    const { event: OnDidEndTaskProcessEvent } = CreateEventStream();
    return {
      onDidStartTask: OnDidStartTaskEvent,
      onDidEndTask: OnDidEndTaskEvent,
      onDidStartTaskProcess: OnDidStartTaskProcessEvent,
      onDidEndTaskProcess: OnDidEndTaskProcessEvent,
      get taskExecutions() {
        return [];
      },
      RegisterTaskProvider: /* @__PURE__ */ __name((Type, Provider, Extension) => Effect.sync(() => {
        const Handle = ++HandleCounter;
        const Entry = {
          Type,
          Provider,
          Extension
        };
        Effect.runSync(
          Ref.update(
            TaskProvidersRef,
            (Map2) => Map2.set(Handle, Entry)
          )
        );
        Effect.runFork(
          IPC.SendNotification("$registerTaskProvider", [
            Handle,
            Type
          ])
        );
        return new Disposable(() => {
          const Cleanup = Ref.update(
            TaskProvidersRef,
            (Map2) => (Map2.delete(Handle), Map2)
          ).pipe(
            Effect.andThen(
              IPC.SendNotification(
                "$unregisterTaskProvider",
                [Handle]
              )
            )
          );
          Effect.runFork(Cleanup);
        });
      }), "RegisterTaskProvider"),
      FetchTasks: /* @__PURE__ */ __name((Filter) => IPC.SendRequest("$fetchTasks", [Filter]).pipe(
        Effect.map(
          (TaskDTOs) => TaskDTOs.map((DTO) => TaskToAPI(DTO))
        ),
        Effect.mapError((Cause) => new Error(String(Cause)))
      ), "FetchTasks"),
      // FIX: Add explicit types to parameters
      ExecuteTask: /* @__PURE__ */ __name((TaskToExecute, Extension) => IPC.SendRequest("$executeTask", [
        TaskFromAPI(TaskToExecute, Extension)
      ]).pipe(
        Effect.map(
          (ExecutionDTO) => ExecutionToAPI(ExecutionDTO, TaskToExecute)
        ),
        Effect.mapError((Cause) => new Error(String(Cause)))
      ), "ExecuteTask")
    };
  })
}) {
  static {
    __name(this, "TaskService");
  }
}
export {
  TaskService
};
//# sourceMappingURL=Task.js.map
