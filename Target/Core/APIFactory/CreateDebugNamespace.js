var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
const CreateDebugNamespace = /* @__PURE__ */ __name((Debug, AsEvent, Extension) => {
  return {
    // --- Properties ---
    get activeDebugSession() {
      return Debug.activeDebugSession;
    },
    get activeDebugConsole() {
      return Debug.activeDebugConsole;
    },
    get breakpoints() {
      return Debug.breakpoints;
    },
    // --- Events ---
    onDidChangeActiveDebugSession: AsEvent(
      Debug.onDidChangeActiveDebugSession
    ),
    onDidStartDebugSession: AsEvent(Debug.onDidStartDebugSession),
    onDidReceiveDebugSessionCustomEvent: AsEvent(
      Debug.onDidReceiveDebugSessionCustomEvent
    ),
    onDidTerminateDebugSession: AsEvent(Debug.onDidTerminateDebugSession),
    onDidChangeBreakpoints: AsEvent(Debug.onDidChangeBreakpoints),
    // --- Methods ---
    registerDebugConfigurationProvider: /* @__PURE__ */ __name((debugType, provider) => {
      return Effect.runSync(
        Debug.RegisterDebugConfigurationProvider(
          debugType,
          provider,
          Extension
        )
      );
    }, "registerDebugConfigurationProvider"),
    registerDebugAdapterDescriptorFactory: /* @__PURE__ */ __name((debugType, factory) => {
      return Effect.runSync(
        Debug.RegisterDebugAdapterDescriptorFactory(
          debugType,
          factory,
          Extension
        )
      );
    }, "registerDebugAdapterDescriptorFactory"),
    registerDebugAdapterTrackerFactory: /* @__PURE__ */ __name((debugType, factory) => {
      return Effect.runSync(
        Debug.RegisterDebugAdapterTrackerFactory(
          debugType,
          factory,
          Extension
        )
      );
    }, "registerDebugAdapterTrackerFactory"),
    startDebugging: /* @__PURE__ */ __name((folder, nameOrConfig, options) => {
      return Effect.runPromise(
        Debug.StartDebugging(folder, nameOrConfig, options)
      );
    }, "startDebugging"),
    stopDebugging: /* @__PURE__ */ __name((session) => {
      return Effect.runPromise(Debug.StopDebugging(session));
    }, "stopDebugging"),
    addBreakpoints: /* @__PURE__ */ __name((breakpoints) => {
      return Effect.runPromise(Debug.AddBreakpoints(breakpoints));
    }, "addBreakpoints"),
    removeBreakpoints: /* @__PURE__ */ __name((breakpoints) => {
      return Effect.runPromise(Debug.RemoveBreakpoints(breakpoints));
    }, "removeBreakpoints")
  };
}, "CreateDebugNamespace");
var CreateDebugNamespace_default = CreateDebugNamespace;
export {
  CreateDebugNamespace_default as default
};
//# sourceMappingURL=CreateDebugNamespace.js.map
