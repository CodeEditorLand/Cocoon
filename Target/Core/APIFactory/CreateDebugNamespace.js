var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
function CreateDebugNamespace(DebugService, AsEvent, Extension) {
  return {
    // --- Properties ---
    get activeDebugSession() {
      return DebugService.activeDebugSession;
    },
    get activeDebugConsole() {
      return DebugService.activeDebugConsole;
    },
    get breakpoints() {
      return DebugService.breakpoints;
    },
    // --- Events ---
    onDidChangeActiveDebugSession: AsEvent(
      DebugService.onDidChangeActiveDebugSession
    ),
    onDidStartDebugSession: AsEvent(DebugService.onDidStartDebugSession),
    onDidReceiveDebugSessionCustomEvent: AsEvent(
      DebugService.onDidReceiveDebugSessionCustomEvent
    ),
    onDidTerminateDebugSession: AsEvent(
      DebugService.onDidTerminateDebugSession
    ),
    onDidChangeBreakpoints: AsEvent(DebugService.onDidChangeBreakpoints),
    // --- Methods ---
    registerDebugConfigurationProvider: /* @__PURE__ */ __name((debugType, provider) => {
      return Effect.runSync(
        DebugService.RegisterDebugConfigurationProvider(
          debugType,
          provider,
          Extension
        )
      );
    }, "registerDebugConfigurationProvider"),
    registerDebugAdapterDescriptorFactory: /* @__PURE__ */ __name((debugType, factory) => {
      return Effect.runSync(
        DebugService.RegisterDebugAdapterDescriptorFactory(
          debugType,
          factory,
          Extension
        )
      );
    }, "registerDebugAdapterDescriptorFactory"),
    registerDebugAdapterTrackerFactory: /* @__PURE__ */ __name((debugType, factory) => {
      return Effect.runSync(
        DebugService.RegisterDebugAdapterTrackerFactory(
          debugType,
          factory,
          Extension
        )
      );
    }, "registerDebugAdapterTrackerFactory"),
    startDebugging: /* @__PURE__ */ __name((folder, nameOrConfig, options) => {
      return Effect.runPromise(
        DebugService.StartDebugging(folder, nameOrConfig, options)
      );
    }, "startDebugging"),
    stopDebugging: /* @__PURE__ */ __name((session) => {
      return Effect.runPromise(DebugService.StopDebugging(session));
    }, "stopDebugging"),
    addBreakpoints: /* @__PURE__ */ __name((breakpoints) => {
      return Effect.runPromise(DebugService.AddBreakpoints(breakpoints));
    }, "addBreakpoints"),
    removeBreakpoints: /* @__PURE__ */ __name((breakpoints) => {
      return Effect.runPromise(
        DebugService.RemoveBreakpoints(breakpoints)
      );
    }, "removeBreakpoints")
  };
}
__name(CreateDebugNamespace, "CreateDebugNamespace");
export {
  CreateDebugNamespace
};
//# sourceMappingURL=CreateDebugNamespace.js.map
