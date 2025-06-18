var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as VSCode from "vscode";
import { EventEmitter } from "vscode";
const CreateDebugNamespace = /* @__PURE__ */ __name((Debug, AsEvent, Extension) => {
  const DebugNamespace = {
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
    get activeStackItem() {
      return void 0;
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
    // Stubbed as per original.
    onDidChangeActiveStackItem: AsEvent(new EventEmitter().event),
    // --- Methods ---
    registerDebugConfigurationProvider: /* @__PURE__ */ __name((debugType, provider) => Debug.RegisterDebugConfigurationProvider(
      debugType,
      provider,
      Extension
    ), "registerDebugConfigurationProvider"),
    registerDebugAdapterDescriptorFactory: /* @__PURE__ */ __name((debugType, factory) => Debug.RegisterDebugAdapterDescriptorFactory(
      debugType,
      factory,
      Extension
    ), "registerDebugAdapterDescriptorFactory"),
    registerDebugAdapterTrackerFactory: /* @__PURE__ */ __name((debugType, factory) => Debug.RegisterDebugAdapterTrackerFactory(
      debugType,
      factory,
      Extension
    ), "registerDebugAdapterTrackerFactory"),
    startDebugging: /* @__PURE__ */ __name((folder, nameOrConfig, options) => Debug.StartDebugging(folder, nameOrConfig, options), "startDebugging"),
    stopDebugging: /* @__PURE__ */ __name((session) => Debug.StopDebugging(session), "stopDebugging"),
    addBreakpoints: /* @__PURE__ */ __name((breakpoints) => Debug.AddBreakpoints(breakpoints), "addBreakpoints"),
    removeBreakpoints: /* @__PURE__ */ __name((breakpoints) => Debug.RemoveBreakpoints(breakpoints), "removeBreakpoints"),
    registerDebugVisualizationProvider: /* @__PURE__ */ __name((_id, _provider) => new EventEmitter().event, "registerDebugVisualizationProvider"),
    // Stub
    registerDebugVisualizationTreeProvider: /* @__PURE__ */ __name((_id, _provider) => new EventEmitter().event, "registerDebugVisualizationTreeProvider"),
    // Stub
    asDebugSourceUri: /* @__PURE__ */ __name((source, session) => {
      const sourcePath = source.path;
      if (typeof sourcePath === "string") {
        const uri = VSCode.Uri.file(sourcePath);
        if (session) {
          return uri.with({ query: `session=${session.id}` });
        }
        return uri;
      }
      throw new Error(
        "asDebugSourceUri: Not implemented for this source type."
      );
    }, "asDebugSourceUri")
  };
  return DebugNamespace;
}, "CreateDebugNamespace");
var CreateDebugNamespace_default = CreateDebugNamespace;
export {
  CreateDebugNamespace_default as default
};
//# sourceMappingURL=CreateDebugNamespace.js.map
