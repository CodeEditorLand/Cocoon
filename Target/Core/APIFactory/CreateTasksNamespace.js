var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
const CreateTasksNamespace = /* @__PURE__ */ __name((Task, AsEvent, Extension) => {
  return {
    // --- Properties ---
    get taskExecutions() {
      return Task.taskExecutions;
    },
    // --- Events ---
    onDidStartTask: AsEvent(Task.onDidStartTask),
    onDidEndTask: AsEvent(Task.onDidEndTask),
    onDidStartTaskProcess: AsEvent(Task.onDidStartTaskProcess),
    onDidEndTaskProcess: AsEvent(Task.onDidEndTaskProcess),
    // --- Methods ---
    registerTaskProvider: /* @__PURE__ */ __name((Type, Provider) => {
      return Effect.runSync(
        Task.RegisterTaskProvider(Type, Provider, Extension)
      );
    }, "registerTaskProvider"),
    fetchTasks: /* @__PURE__ */ __name((Filter) => {
      return Effect.runPromise(Task.FetchTasks(Filter));
    }, "fetchTasks"),
    executeTask: /* @__PURE__ */ __name((TaskParameter) => {
      return Effect.runPromise(
        Task.ExecuteTask(TaskParameter, Extension)
      );
    }, "executeTask")
  };
}, "CreateTasksNamespace");
var CreateTasksNamespace_default = CreateTasksNamespace;
export {
  CreateTasksNamespace_default as default
};
//# sourceMappingURL=CreateTasksNamespace.js.map
