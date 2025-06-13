var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref, Stream } from "effect";
import { Disposable } from "vscode";
import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC } from "../IPC.js";
import { ProvideTasks } from "./RPCHandlers/ProvideTasks.js";
let HandleCounter = 0;
const Definition = Effect.gen(function* (_) {
  const IPCService = yield* _(IPC.Tag);
  const TaskProviders = yield* _(Ref.make(/* @__PURE__ */ new Map()));
  IPCService.RegisterInvokeHandler(
    "$provideTasks",
    ([handle, tokenID]) => Effect.runPromise(ProvideTasks(TaskProviders, handle, tokenID))
  );
  const OnDidStartTaskEvent = CreateEventStream();
  const OnDidEndTaskEvent = CreateEventStream();
  const OnDidStartTaskProcessEvent = CreateEventStream();
  const OnDidEndTaskProcessEvent = CreateEventStream();
  const ServiceImplementation = {
    onDidStartTask: OnDidStartTaskEvent.Stream.pipe(Stream.toEvent),
    onDidEndTask: OnDidEndTaskEvent.Stream.pipe(Stream.toEvent),
    onDidStartTaskProcess: OnDidStartTaskProcessEvent.Stream.pipe(
      Stream.toEvent
    ),
    onDidEndTaskProcess: OnDidEndTaskProcessEvent.Stream.pipe(
      Stream.toEvent
    ),
    taskExecutions: [],
    // This would be managed by state from the host
    RegisterTaskProvider: /* @__PURE__ */ __name((Type, Provider, Extension) => Effect.sync(() => {
      const Handle = ++HandleCounter;
      Ref.update(
        TaskProviders,
        (map) => map.set(Handle, { Type, Provider, Extension })
      ).pipe(Effect.runSync);
      IPCService.SendNotification("$registerTaskProvider", [
        Handle,
        Type
      ]).pipe(Effect.runFork);
      return new Disposable(() => {
        Ref.update(
          TaskProviders,
          (map) => (map.delete(Handle), map)
        ).pipe(Effect.runSync);
        IPCService.SendNotification("$unregisterTaskProvider", [
          Handle
        ]).pipe(Effect.runFork);
      });
    }), "RegisterTaskProvider"),
    FetchTasks: /* @__PURE__ */ __name((Filter) => IPCService.SendRequest("$fetchTasks", [Filter]).pipe(
      Effect.map(
        (dtos) => dtos.map((dto) => TypeConverter.Task.toAPI(dto))
      )
    ), "FetchTasks"),
    ExecuteTask: /* @__PURE__ */ __name((TaskToExecute, Extension) => IPCService.SendRequest("$executeTask", [
      TypeConverter.Task.fromAPI(TaskToExecute, Extension)
    ]).pipe(
      Effect.map(
        (dto) => TypeConverter.Task.Execution.toAPI(dto, TaskToExecute)
      )
    ), "ExecuteTask")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
