var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import {
  Disposable
} from "vscode";
import { IPCService } from "./IPC.js";
import { DebugProviderRegistrationProblem } from "./Debug/DebugProviderRegistrationProblem.js";
import { StartDebuggingProblem } from "./Debug/StartDebuggingProblem.js";
import { CreateEventStream } from "./Utility/CreateEventStream.js";
class DebugService extends Effect.Service()(
  "Service/Debug",
  {
    effect: Effect.gen(function* () {
      const IPC = yield* IPCService;
      let HandleCounter = 0;
      const DebugStateRef = yield* Ref.make({
        ActiveDebugSession: void 0,
        ActiveDebugConsole: {
          append: /* @__PURE__ */ __name((_Value) => {
          }, "append"),
          appendLine: /* @__PURE__ */ __name((_Value) => {
          }, "appendLine")
        },
        Breakpoints: [],
        DebugConfigurationProviders: /* @__PURE__ */ new Map(),
        DebugAdapterDescriptorFactories: /* @__PURE__ */ new Map(),
        DebugAdapterTrackerFactories: /* @__PURE__ */ new Map()
      });
      const { event: OnDidChangeActiveDebugSessionEvent } = CreateEventStream();
      const { event: OnDidStartDebugSessionEvent } = CreateEventStream();
      const { event: OnDidReceiveDebugSessionCustomEvent } = CreateEventStream();
      const { event: OnDidTerminateDebugSessionEvent } = CreateEventStream();
      const { event: OnDidChangeBreakpointsEvent } = CreateEventStream();
      const RegisterProvider = /* @__PURE__ */ __name((RegistryRef, Data) => Effect.gen(function* () {
        const Handle = ++HandleCounter;
        yield* Ref.update(
          RegistryRef,
          (TheMap) => TheMap.set(Handle, Data)
        );
        yield* IPC.SendNotification(
          "$registerDebugConfigurationProvider",
          [Handle, Data.Type]
        ).pipe(
          Effect.mapError(
            (Cause) => new DebugProviderRegistrationProblem({
              DebugType: Data.Type,
              Cause
            })
          )
        );
        const Cleanup = Ref.update(
          RegistryRef,
          (TheMap) => (TheMap.delete(Handle), TheMap)
        ).pipe(
          Effect.andThen(
            IPC.SendNotification(
              "$unregisterDebugConfigurationProvider",
              [Handle]
            )
          )
        );
        return new Disposable(() => Effect.runFork(Cleanup));
      }), "RegisterProvider");
      const GetState = /* @__PURE__ */ __name(() => Ref.get(DebugStateRef), "GetState");
      return {
        get activeDebugSession() {
          return Effect.runSync(GetState()).ActiveDebugSession;
        },
        get activeDebugConsole() {
          return Effect.runSync(GetState()).ActiveDebugConsole;
        },
        get breakpoints() {
          return Effect.runSync(GetState()).Breakpoints;
        },
        onDidChangeActiveDebugSession: OnDidChangeActiveDebugSessionEvent,
        onDidStartDebugSession: OnDidStartDebugSessionEvent,
        onDidReceiveDebugSessionCustomEvent: OnDidReceiveDebugSessionCustomEvent,
        onDidTerminateDebugSession: OnDidTerminateDebugSessionEvent,
        onDidChangeBreakpoints: OnDidChangeBreakpointsEvent,
        RegisterDebugConfigurationProvider: /* @__PURE__ */ __name((DebugType, Provider, _trigger, Extension) => RegisterProvider(
          Effect.runSync(GetState()).DebugConfigurationProviders,
          { Type: DebugType, Provider, Extension }
        ), "RegisterDebugConfigurationProvider"),
        RegisterDebugAdapterDescriptorFactory: /* @__PURE__ */ __name((DebugType, Factory, Extension) => RegisterProvider(
          Effect.runSync(GetState()).DebugAdapterDescriptorFactories,
          { Type: DebugType, Provider: Factory, Extension }
        ), "RegisterDebugAdapterDescriptorFactory"),
        RegisterDebugAdapterTrackerFactory: /* @__PURE__ */ __name((DebugType, Factory, Extension) => RegisterProvider(
          Effect.runSync(GetState()).DebugAdapterTrackerFactories,
          { Type: DebugType, Provider: Factory, Extension }
        ), "RegisterDebugAdapterTrackerFactory"),
        StartDebugging: /* @__PURE__ */ __name((Folder, NameOrConfiguration, Options) => Effect.gen(function* () {
          yield* Effect.logInfo(
            `Request to start debugging in folder: ${Folder?.name ?? "None"}`,
            NameOrConfiguration
          );
          const ConfigurationDTO = typeof NameOrConfiguration === "string" ? { name: NameOrConfiguration } : NameOrConfiguration;
          const OptionsDTO = {
            parentSession: Options?.parentSession?.id,
            lifecycleManagedByParent: Options?.lifecycleManagedByParent
          };
          const IsSuccess = yield* IPC.SendRequest(
            "$startDebugging",
            [
              Folder?.uri.toJSON(),
              ConfigurationDTO,
              OptionsDTO
            ]
          );
          if (IsSuccess) {
            yield* Effect.logInfo(
              "Debug session started successfully."
            );
          }
          return IsSuccess;
        }).pipe(
          Effect.mapError(
            (Cause) => new StartDebuggingProblem({ Cause })
          )
        ), "StartDebugging"),
        StopDebugging: /* @__PURE__ */ __name((Session) => Effect.gen(function* () {
          const ActiveSession = (yield* Ref.get(DebugStateRef)).ActiveDebugSession;
          const SessionToStop = Session ?? ActiveSession;
          if (!SessionToStop) {
            return yield* Effect.logWarning(
              "StopDebugging called but no session is active."
            );
          }
          yield* Effect.logInfo(
            `Request to stop debugging session: ${SessionToStop.id}`
          );
          yield* IPC.SendNotification("$stopDebugging", [
            SessionToStop.id
          ]);
        }).pipe(
          Effect.mapError(
            (Cause) => new Error("Failed to stop debugging session.", {
              cause: Cause
            })
          )
        ), "StopDebugging"),
        AddBreakpoints: /* @__PURE__ */ __name((_Breakpoints) => Effect.sync(
          () => console.warn(
            "STUB: Debug.AddBreakpoints not implemented."
          )
        ), "AddBreakpoints"),
        RemoveBreakpoints: /* @__PURE__ */ __name((_Breakpoints) => Effect.sync(
          () => console.warn(
            "STUB: Debug.RemoveBreakpoints not implemented."
          )
        ), "RemoveBreakpoints")
      };
    })
  }
) {
  static {
    __name(this, "DebugService");
  }
}
export {
  DebugService
};
//# sourceMappingURL=Debug.js.map
