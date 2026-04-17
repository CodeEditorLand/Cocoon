var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/TasksNamespace.ts
var TaskProviderCounter = 0;
var EventSubscriber = /* @__PURE__ */ __name((Context, EventName) => (Listener) => {
  Context.Emitter.on(EventName, Listener);
  return {
    dispose: /* @__PURE__ */ __name(() => {
      Context.Emitter.off(EventName, Listener);
    }, "dispose")
  };
}, "EventSubscriber");
var CreateTasksNamespace = /* @__PURE__ */ __name((Context) => ({
  registerTaskProvider: /* @__PURE__ */ __name((TaskType, _Provider) => {
    const Handle = `taskProvider:${++TaskProviderCounter}`;
    Context.SendToMountain("register_task_provider", {
      handle: Handle,
      task_type: TaskType,
      extension_id: ""
    }).catch(() => {
    });
    return {
      dispose: /* @__PURE__ */ __name(() => {
        Context.SendToMountain("unregister_task_provider", {
          handle: Handle
        }).catch(() => {
        });
      }, "dispose")
    };
  }, "registerTaskProvider"),
  fetchTasks: /* @__PURE__ */ __name(async (Filter) => {
    try {
      const Response = await Context.MountainClient?.sendRequest("Task.Fetch", [
        Filter
      ]);
      return Array.isArray(Response) ? Response : [];
    } catch {
      return [];
    }
  }, "fetchTasks"),
  executeTask: /* @__PURE__ */ __name(async (Task) => {
    try {
      return await Context.MountainClient?.sendRequest("Task.Execute", [Task]);
    } catch {
      return void 0;
    }
  }, "executeTask"),
  onDidStartTask: EventSubscriber(Context, "task.didStart"),
  onDidEndTask: EventSubscriber(Context, "task.didEnd"),
  onDidStartTaskProcess: EventSubscriber(Context, "task.didStartProcess"),
  onDidEndTaskProcess: EventSubscriber(Context, "task.didEndProcess"),
  taskExecutions: []
}), "CreateTasksNamespace");
var TasksNamespace_default = CreateTasksNamespace;
export {
  TasksNamespace_default as default
};
//# sourceMappingURL=TasksNamespace.js.map
