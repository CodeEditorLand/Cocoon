var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import * as TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import RegisterProvider from "./RegisterProvider.js";
var Definition_default = Effect.gen(function* () {
  const IPC = yield* IPCService;
  const ActiveSession = yield* Ref.make(void 0);
  const ConfigProviders = yield* Ref.make(/* @__PURE__ */ new Map());
  const DescriptorFactories = yield* Ref.make(/* @__PURE__ */ new Map());
  const TrackerFactories = yield* Ref.make(/* @__PURE__ */ new Map());
  const OnDidChangeActiveDebugSessionEvent = CreateEventStream();
  const OnDidStartDebugSessionEvent = CreateEventStream();
  const OnDidReceiveDebugSessionCustomEvent = CreateEventStream();
  const OnDidTerminateDebugSessionEvent = CreateEventStream();
  const OnDidChangeBreakpointsEvent = CreateEventStream();
  IPC.RegisterInvokeHandler(
    "$provideDebugConfigurations",
    ([_Handle, _FolderDTO, _Token]) => Effect.gen(function* () {
    }).pipe(Effect.runPromise)
  );
  IPC.RegisterInvokeHandler(
    "$resolveDebugConfiguration",
    ([_Handle, _FolderDTO, _ConfigDTO, _Token]) => Effect.gen(function* () {
    }).pipe(Effect.runPromise)
  );
  IPC.RegisterInvokeHandler(
    "$createDebugAdapterDescriptor",
    ([_Handle, _SessionDTO, _ExecutableDTO]) => Effect.gen(function* () {
    }).pipe(Effect.runPromise)
  );
  const DebugImplementation = {
    onDidChangeActiveDebugSession: OnDidChangeActiveDebugSessionEvent.event,
    onDidStartDebugSession: OnDidStartDebugSessionEvent.event,
    onDidReceiveDebugSessionCustomEvent: OnDidReceiveDebugSessionCustomEvent.event,
    onDidTerminateDebugSession: OnDidTerminateDebugSessionEvent.event,
    onDidChangeBreakpoints: OnDidChangeBreakpointsEvent.event,
    get activeDebugSession() {
      return Effect.runSync(Ref.get(ActiveSession));
    },
    get activeDebugConsole() {
      throw new Error("activeDebugConsole not implemented.");
    },
    get breakpoints() {
      return [];
    },
    RegisterDebugConfigurationProvider: /* @__PURE__ */ __name((Type, Provider, Extension) => RegisterProvider(
      ConfigProviders,
      IPC,
      "$registerDebugConfigurationProvider",
      { Type, Provider, Extension }
    ), "RegisterDebugConfigurationProvider"),
    RegisterDebugAdapterDescriptorFactory: /* @__PURE__ */ __name((Type, Factory, Extension) => RegisterProvider(
      DescriptorFactories,
      IPC,
      "$registerDebugAdapterDescriptorFactory",
      { Type, Factory, Extension }
    ), "RegisterDebugAdapterDescriptorFactory"),
    RegisterDebugAdapterTrackerFactory: /* @__PURE__ */ __name((Type, Factory, Extension) => RegisterProvider(
      TrackerFactories,
      IPC,
      "$registerDebugAdapterTrackerFactory",
      { Type, Factory, Extension }
    ), "RegisterDebugAdapterTrackerFactory"),
    StartDebugging: /* @__PURE__ */ __name((Folder, Configuration, Options) => IPC.SendRequest("$startDebugging", [
      Folder ? TypeConverter.URI.FromAPI(Folder.uri) : void 0,
      Configuration,
      Options
    ]).pipe(Effect.map((Result) => !!Result)), "StartDebugging"),
    StopDebugging: /* @__PURE__ */ __name((Session) => IPC.SendNotification("$stopDebugging", [Session?.id]), "StopDebugging"),
    AddBreakpoints: /* @__PURE__ */ __name((_Breakpoints) => IPC.SendNotification("$addBreakpoints", [
      // Convert breakpoints to DTOs
    ]), "AddBreakpoints"),
    RemoveBreakpoints: /* @__PURE__ */ __name((_Breakpoints) => IPC.SendNotification("$removeBreakpoints", [
      // Convert breakpoints to DTOs
    ]), "RemoveBreakpoints")
  };
  return DebugImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
