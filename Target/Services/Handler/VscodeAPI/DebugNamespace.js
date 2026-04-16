var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/DebugNamespace.ts
var CreateDebugNamespace = /* @__PURE__ */ __name((_Context) => ({
  registerDebugAdapterDescriptorFactory: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "registerDebugAdapterDescriptorFactory"),
  registerDebugConfigurationProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "registerDebugConfigurationProvider"),
  startDebugging: /* @__PURE__ */ __name(async () => false, "startDebugging"),
  onDidStartDebugSession: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "onDidStartDebugSession"),
  onDidTerminateDebugSession: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "onDidTerminateDebugSession"),
  onDidChangeActiveDebugSession: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "onDidChangeActiveDebugSession"),
  onDidReceiveDebugSessionCustomEvent: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "onDidReceiveDebugSessionCustomEvent"),
  activeDebugSession: void 0,
  breakpoints: []
}), "CreateDebugNamespace");
var DebugNamespace_default = CreateDebugNamespace;
export {
  DebugNamespace_default as default
};
//# sourceMappingURL=DebugNamespace.js.map
