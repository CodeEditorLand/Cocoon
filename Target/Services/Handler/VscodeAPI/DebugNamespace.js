var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/DebugNamespace.ts
var DebugProviderCounter = 0;
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
    const Handle = `debugAdapter:${++DebugProviderCounter}`;
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
    const Handle = `debugConfig:${++DebugProviderCounter}`;
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
      await Context.MountainClient?.sendRequest("Debug.Stop", [Session]);
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
  breakpoints: []
}), "CreateDebugNamespace");
var DebugNamespace_default = CreateDebugNamespace;
export {
  DebugNamespace_default as default
};
//# sourceMappingURL=DebugNamespace.js.map
