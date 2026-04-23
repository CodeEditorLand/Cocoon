var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/LanguageProviderRegistry.ts
var Callbacks = /* @__PURE__ */ new Map();
function Register(Handle, Provider) {
  Callbacks.set(Handle, Provider);
}
__name(Register, "Register");
function Unregister(Handle) {
  Callbacks.delete(Handle);
}
__name(Unregister, "Unregister");
function Get(Handle) {
  const Provider = Callbacks.get(Handle);
  if (process.env.LAND_DEV_LOG) {
    console.warn(
      `[DEV:LANG] Get(handle=${Handle}) resolved=${Boolean(Provider)} (total_registered=${Callbacks.size})`
    );
  }
  return Provider;
}
__name(Get, "Get");
var NextHandle = 1e4;
function RegisterAutoHandle(Provider) {
  const Handle = NextHandle++;
  Callbacks.set(Handle, Provider);
  return Handle;
}
__name(RegisterAutoHandle, "RegisterAutoHandle");
function NextProviderHandle() {
  return NextHandle++;
}
__name(NextProviderHandle, "NextProviderHandle");
var Commands = /* @__PURE__ */ new Map();
function RegisterCommand(CommandId, Callback) {
  Commands.set(CommandId, Callback);
}
__name(RegisterCommand, "RegisterCommand");
function ExecuteCommand(CommandId, ...Args) {
  const Handler = Commands.get(CommandId);
  if (Handler) return Handler(...Args);
  return void 0;
}
__name(ExecuteCommand, "ExecuteCommand");
function UnregisterCommand(CommandId) {
  Commands.delete(CommandId);
}
__name(UnregisterCommand, "UnregisterCommand");
function ListCommands() {
  return Array.from(Commands.keys());
}
__name(ListCommands, "ListCommands");
function ListHandles() {
  return Array.from(Callbacks.keys());
}
__name(ListHandles, "ListHandles");

// Source/Services/Handler/VscodeAPI/TasksNamespace.ts
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
    const Handle = NextProviderHandle();
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
      const Response = await Context.MountainClient?.sendRequest(
        "Task.Fetch",
        [Filter]
      );
      return Array.isArray(Response) ? Response : [];
    } catch {
      return [];
    }
  }, "fetchTasks"),
  executeTask: /* @__PURE__ */ __name(async (Task) => {
    try {
      return await Context.MountainClient?.sendRequest("Task.Execute", [
        Task
      ]);
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
