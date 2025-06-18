var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import IPCService from "../IPC/Service.js";
import RegisterProviderEffect from "./RegisterProvider.js";
var Definition_default = Effect.gen(function* (G) {
  const IPC = yield* G(IPCService);
  const DebugStateRef = yield* G(
    Ref.make({
      ActiveDebugSession: void 0,
      ActiveDebugConsole: {
        append: /* @__PURE__ */ __name((_value) => {
        }, "append"),
        appendLine: /* @__PURE__ */ __name((_value) => {
        }, "appendLine")
      },
      Breakpoints: [],
      DebugConfigurationProviders: /* @__PURE__ */ new Map(),
      DebugAdapterDescriptorFactories: /* @__PURE__ */ new Map(),
      DebugAdapterTrackerFactories: /* @__PURE__ */ new Map()
    })
  );
  const Events = {
    onDidChangeActiveDebugSession: void 0,
    onDidStartDebugSession: void 0,
    onDidReceiveDebugSessionCustomEvent: void 0,
    onDidTerminateDebugSession: void 0,
    onDidChangeBreakpoints: void 0
  };
  const ServiceImplementation = {
    // Properties
    get activeDebugSession() {
      return Effect.runSync(Ref.get(DebugStateRef)).ActiveDebugSession;
    },
    get activeDebugConsole() {
      return Effect.runSync(Ref.get(DebugStateRef)).ActiveDebugConsole;
    },
    get breakpoints() {
      return Effect.runSync(Ref.get(DebugStateRef)).Breakpoints;
    },
    ...Events,
    // Methods
    RegisterDebugConfigurationProvider: /* @__PURE__ */ __name((DebugType, Provider, Extension) => RegisterProviderEffect(
      (yield * G(DebugStateRef)).DebugConfigurationProviders,
      {
        Type: DebugType,
        Provider,
        Extension
      }
    ).pipe(Effect.provideService(IPCService, IPC)), "RegisterDebugConfigurationProvider"),
    // Provide dependency to helper
    RegisterDebugAdapterDescriptorFactory: /* @__PURE__ */ __name((DebugType, Factory, Extension) => RegisterProviderEffect(
      (yield * G(DebugStateRef)).DebugAdapterDescriptorFactories,
      {
        Type: DebugType,
        Provider: Factory,
        Extension
      }
    ).pipe(Effect.provideService(IPCService, IPC)), "RegisterDebugAdapterDescriptorFactory"),
    RegisterDebugAdapterTrackerFactory: /* @__PURE__ */ __name((DebugType, Factory, Extension) => RegisterProviderEffect(
      (yield * G(DebugStateRef)).DebugAdapterTrackerFactories,
      {
        Type: DebugType,
        Provider: Factory,
        Extension
      }
    ).pipe(Effect.provideService(IPCService, IPC)), "RegisterDebugAdapterTrackerFactory"),
    StartDebugging: /* @__PURE__ */ __name((_folder, _nameOrConfig, _options) => Effect.succeed(true), "StartDebugging"),
    // Stubbed
    StopDebugging: /* @__PURE__ */ __name((_session) => Effect.void, "StopDebugging"),
    // Stubbed
    AddBreakpoints: /* @__PURE__ */ __name((_breakpoints) => Effect.void, "AddBreakpoints"),
    // Stubbed
    RemoveBreakpoints: /* @__PURE__ */ __name((_breakpoints) => Effect.void, "RemoveBreakpoints")
    // Stubbed
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
