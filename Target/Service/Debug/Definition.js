var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref, Stream } from "effect";
import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC } from "../IPC.js";
import { RegisterProvider } from "./RegisterProvider.js";
const Definition = Effect.gen(function* (_) {
  const IPCService = yield* _(IPC.Tag);
  const ActiveSession = yield* _(
    Ref.make(void 0)
  );
  const ConfigProviders = yield* _(Ref.make(/* @__PURE__ */ new Map()));
  const DescriptorFactories = yield* _(Ref.make(/* @__PURE__ */ new Map()));
  const TrackerFactories = yield* _(Ref.make(/* @__PURE__ */ new Map()));
  const OnDidChangeActiveDebugSessionEvent = CreateEventStream();
  const OnDidStartDebugSessionEvent = CreateEventStream();
  const OnDidReceiveDebugSessionCustomEvent = CreateEventStream();
  const OnDidTerminateDebugSessionEvent = CreateEventStream();
  const OnDidChangeBreakpointsEvent = CreateEventStream();
  IPCService.RegisterInvokeHandler(
    "$provideDebugConfigurations",
    ([handle, folderDTO, token]) => Effect.gen(function* (_2) {
    }).pipe(Effect.runPromise)
  );
  IPCService.RegisterInvokeHandler(
    "$resolveDebugConfiguration",
    ([handle, folderDTO, configDTO, token]) => Effect.gen(function* (_2) {
    }).pipe(Effect.runPromise)
  );
  IPCService.RegisterInvokeHandler(
    "$createDebugAdapterDescriptor",
    ([handle, sessionDTO, executableDTO]) => Effect.gen(function* (_2) {
    }).pipe(Effect.runPromise)
  );
  const ServiceImplementation = {
    // Events
    onDidChangeActiveDebugSession: OnDidChangeActiveDebugSessionEvent.Stream.pipe(Stream.toEvent),
    onDidStartDebugSession: OnDidStartDebugSessionEvent.Stream.pipe(
      Stream.toEvent
    ),
    onDidReceiveDebugSessionCustomEvent: OnDidReceiveDebugSessionCustomEvent.Stream.pipe(Stream.toEvent),
    onDidTerminateDebugSession: OnDidTerminateDebugSessionEvent.Stream.pipe(
      Stream.toEvent
    ),
    onDidChangeBreakpoints: OnDidChangeBreakpointsEvent.Stream.pipe(
      Stream.toEvent
    ),
    // Properties
    get activeDebugSession() {
      return Ref.get(ActiveSession).pipe(Effect.runSync);
    },
    get activeDebugConsole() {
      throw new Error("activeDebugConsole not implemented.");
    },
    get breakpoints() {
      return [];
    },
    // Methods
    RegisterDebugConfigurationProvider: /* @__PURE__ */ __name((Type, Provider, Extension) => RegisterProvider(
      ConfigProviders,
      IPCService,
      "$registerDebugConfigurationProvider",
      { Type, Provider, Extension }
    ), "RegisterDebugConfigurationProvider"),
    RegisterDebugAdapterDescriptorFactory: /* @__PURE__ */ __name((Type, Factory, Extension) => RegisterProvider(
      DescriptorFactories,
      IPCService,
      "$registerDebugAdapterDescriptorFactory",
      { Type, Factory, Extension }
    ), "RegisterDebugAdapterDescriptorFactory"),
    RegisterDebugAdapterTrackerFactory: /* @__PURE__ */ __name((Type, Factory, Extension) => RegisterProvider(
      TrackerFactories,
      IPCService,
      "$registerDebugAdapterTrackerFactory",
      { Type, Factory, Extension }
    ), "RegisterDebugAdapterTrackerFactory"),
    StartDebugging: /* @__PURE__ */ __name((Folder, Configuration, Options) => IPCService.SendRequest("$startDebugging", [
      Folder ? TypeConverter.URIConverter.FromAPI(Folder.uri) : void 0,
      Configuration,
      // Needs DTO conversion
      Options
      // Needs DTO conversion
    ]).pipe(Effect.map((result) => !!result)), "StartDebugging"),
    StopDebugging: /* @__PURE__ */ __name((Session) => IPCService.SendNotification("$stopDebugging", [Session?.id]), "StopDebugging"),
    AddBreakpoints: /* @__PURE__ */ __name((Breakpoints) => IPCService.SendNotification("$addBreakpoints", [
      // Convert breakpoints to DTOs
    ]), "AddBreakpoints"),
    RemoveBreakpoints: /* @__PURE__ */ __name((Breakpoints) => IPCService.SendNotification("$removeBreakpoints", [
      // Convert breakpoints to DTOs
    ]), "RemoveBreakpoints")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
