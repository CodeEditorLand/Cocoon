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
function HasCommand(CommandId) {
  return Commands.has(CommandId);
}
__name(HasCommand, "HasCommand");
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

// Source/Services/Handler/VscodeAPI/DebugNamespace.ts
var EventSubscriber = /* @__PURE__ */ __name((Context, EventName) => (Listener) => {
  Context.Emitter.on(EventName, Listener);
  return {
    dispose: /* @__PURE__ */ __name(() => {
      Context.Emitter.off(EventName, Listener);
    }, "dispose")
  };
}, "EventSubscriber");
var CreateDebugNamespace = /* @__PURE__ */ __name((Context) => ({
  registerDebugAdapterDescriptorFactory: /* @__PURE__ */ __name((DebugType, _Factory) => {
    const Handle = NextProviderHandle();
    Context.SendToMountain("register_debug_adapter", {
      handle: Handle,
      debug_type: DebugType,
      extension_id: ""
    }).catch(() => {
    });
    return {
      dispose: /* @__PURE__ */ __name(() => {
        Context.SendToMountain("unregister_debug_adapter", {
          handle: Handle
        }).catch(() => {
        });
      }, "dispose")
    };
  }, "registerDebugAdapterDescriptorFactory"),
  registerDebugConfigurationProvider: /* @__PURE__ */ __name((DebugType, _Provider) => {
    const Handle = NextProviderHandle();
    Context.SendToMountain("register_debug_configuration_provider", {
      handle: Handle,
      debug_type: DebugType
    }).catch(() => {
    });
    return {
      dispose: /* @__PURE__ */ __name(() => {
        Context.SendToMountain(
          "unregister_debug_configuration_provider",
          {
            handle: Handle
          }
        ).catch(() => {
        });
      }, "dispose")
    };
  }, "registerDebugConfigurationProvider"),
  registerDebugAdapterTrackerFactory: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "registerDebugAdapterTrackerFactory"),
  // Proposed API (`vscode.proposed.debugVisualization.d.ts`). Custom
  // debug-variable renderers (e.g. Microsoft's JS debugger providing
  // rich object views) opt in via `enabledApiProposals`. Stub until a
  // renderer consumer lands - real wiring routes through Mountain's
  // DebugService.
  registerDebugVisualizationProvider: /* @__PURE__ */ __name((_Id, _Provider) => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "registerDebugVisualizationProvider"),
  registerDebugVisualizationTreeProvider: /* @__PURE__ */ __name((_Id, _Provider) => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "registerDebugVisualizationTreeProvider"),
  startDebugging: /* @__PURE__ */ __name(async (Folder, NameOrConfig, ParentSession) => {
    try {
      const Response = await Context.MountainClient?.sendRequest(
        "Debug.Start",
        [Folder, NameOrConfig, ParentSession]
      );
      return Boolean(Response?.success);
    } catch {
      return false;
    }
  }, "startDebugging"),
  stopDebugging: /* @__PURE__ */ __name(async (Session) => {
    try {
      const SessionId = typeof Session === "string" ? Session : Session?.id ?? "";
      await Context.MountainClient?.sendRequest("Debug.Stop", [SessionId]);
    } catch {
    }
  }, "stopDebugging"),
  addBreakpoints: /* @__PURE__ */ __name((Breakpoints) => {
    Context.SendToMountain("debug.addBreakpoints", {
      breakpoints: Breakpoints
    }).catch(() => {
    });
  }, "addBreakpoints"),
  removeBreakpoints: /* @__PURE__ */ __name((Breakpoints) => {
    Context.SendToMountain("debug.removeBreakpoints", {
      breakpoints: Breakpoints
    }).catch(() => {
    });
  }, "removeBreakpoints"),
  asDebugSourceUri: /* @__PURE__ */ __name((Source) => Source, "asDebugSourceUri"),
  onDidStartDebugSession: EventSubscriber(Context, "debug.didStartSession"),
  onDidTerminateDebugSession: EventSubscriber(
    Context,
    "debug.didTerminateSession"
  ),
  onDidChangeActiveDebugSession: EventSubscriber(
    Context,
    "debug.didChangeActiveSession"
  ),
  onDidReceiveDebugSessionCustomEvent: EventSubscriber(
    Context,
    "debug.didReceiveCustomEvent"
  ),
  onDidChangeBreakpoints: EventSubscriber(
    Context,
    "debug.didChangeBreakpoints"
  ),
  activeDebugSession: void 0,
  activeDebugConsole: {
    append: /* @__PURE__ */ __name((Value) => {
      Context.SendToMountain("debug.consoleAppend", {
        value: Value
      }).catch(() => {
      });
    }, "append"),
    appendLine: /* @__PURE__ */ __name((Value) => {
      Context.SendToMountain("debug.consoleAppend", {
        value: `${Value}
`
      }).catch(() => {
      });
    }, "appendLine")
  },
  breakpoints: [],
  // Stable 1.88+ surface: current selected debug stack item. Land's
  // debug service doesn't track per-frame selection yet, so this reads
  // as undefined and the associated event never fires. Real subscribe
  // path is still a proper disposable so the extension teardown works.
  activeStackItem: void 0,
  onDidChangeActiveStackItem: EventSubscriber(
    Context,
    "debug.didChangeActiveStackItem"
  )
}), "CreateDebugNamespace");
var DebugNamespace_default = CreateDebugNamespace;
export {
  DebugNamespace_default as default
};
//# sourceMappingURL=DebugNamespace.js.map
