var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
function CreateTasksNamespace(TaskService, AsEvent, Extension) {
  return {
    // --- Properties ---
    get taskExecutions() {
      return TaskService.taskExecutions;
    },
    // --- Events ---
    onDidStartTask: AsEvent(TaskService.onDidStartTask),
    onDidEndTask: AsEvent(TaskService.onDidEndTask),
    onDidStartTaskProcess: AsEvent(TaskService.onDidStartTaskProcess),
    onDidEndTaskProcess: AsEvent(TaskService.onDidEndTaskProcess),
    // --- Methods ---
    registerTaskProvider: /* @__PURE__ */ __name((type, provider) => {
      return Effect.runSync(
        TaskService.RegisterTaskProvider(type, provider, Extension)
      );
    }, "registerTaskProvider"),
    fetchTasks: /* @__PURE__ */ __name((filter) => {
      return Effect.runPromise(TaskService.FetchTasks(filter));
    }, "fetchTasks"),
    executeTask: /* @__PURE__ */ __name((task) => {
      return Effect.runPromise(TaskService.ExecuteTask(task, Extension));
    }, "executeTask")
  };
}
__name(CreateTasksNamespace, "CreateTasksNamespace");
export {
  CreateTasksNamespace
};
//# sourceMappingURL=CreateTasksNamespace.js.map
