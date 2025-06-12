var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref, Stream } from "effect";
import { Disposable } from "vscode";
import * as TypeConverter from "../../TypeConverter/mod.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IpcProvider } from "../Ipc/mod.js";
import { ProvideTasks } from "./RpcHandlers/ProvideTasks.js";
let HandleCounter = 0;
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const TaskProviders = yield* _(Ref.make(/* @__PURE__ */ new Map()));
  Ipc.RegisterInvokeHandler(
    "$provideTasks",
    ([handle]) => Effect.runPromise(ProvideTasks(TaskProviders, handle))
  );
  const OnDidStartTaskEvent = CreateEventStream();
  const OnDidEndTaskEvent = CreateEventStream();
  const ServiceImplementation = {
    onDidStartTask: OnDidStartTaskEvent.Stream.pipe(Stream.toEvent),
    onDidEndTask: OnDidEndTaskEvent.Stream.pipe(Stream.toEvent),
    RegisterTaskProvider: /* @__PURE__ */ __name((Type, Provider, Extension) => Effect.acquireRelease(
      Effect.sync(() => {
        const Handle = ++HandleCounter;
        Ref.update(
          TaskProviders,
          (map) => map.set(Handle, { Type, Provider, Extension })
        ).pipe(Effect.runSync);
        Ipc.SendNotification("$registerTaskProvider", [
          Handle,
          Type
        ]).pipe(Effect.runFork);
        return new Disposable(
          () => Ipc.SendNotification("$unregisterTaskProvider", [
            Handle
          ]).pipe(Effect.runFork)
        );
      }),
      (disposable) => Effect.sync(() => disposable.dispose())
    ), "RegisterTaskProvider"),
    FetchTasks: /* @__PURE__ */ __name((Filter) => Ipc.SendRequest("$fetchTasks", [Filter]).pipe(
      Effect.map(
        (dtos) => dtos.map((dto) => TypeConverter.Task.toApi(dto))
      )
    ), "FetchTasks"),
    ExecuteTask: /* @__PURE__ */ __name((TaskToExecute, Extension) => Ipc.SendRequest("$executeTask", [
      TypeConverter.Task.fromApi(TaskToExecute, Extension)
    ]).pipe(
      Effect.map(
        (dto) => TypeConverter.TaskExecution.toApi(dto, TaskToExecute)
      )
    ), "ExecuteTask")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
