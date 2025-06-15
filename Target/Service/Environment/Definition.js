var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Schemas } from "vs/base/common/network.js";
import TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import ClipboardService from "../Clipboard/Service.js";
import InitDataService from "../InitData/Service.js";
import IPCService from "../IPC/Service.js";
const TelemetryLevel = {
  NONE: 0,
  OFF: 0,
  // Assuming OFF is an alias for NONE
  ERROR: 1,
  USAGE: 2
};
var Definition_default = Effect.gen(function* () {
  const InitData = yield* InitDataService;
  const IPC = yield* IPCService;
  const Clipboard = yield* ClipboardService;
  const LogLevelRef = yield* Ref.make(
    InitData.logLevel
  );
  const OnDidChangeLogLevelEvent = CreateEventStream();
  const OnDidChangeShellEvent = CreateEventStream();
  const OnDidChangeTelemetryEvent = CreateEventStream();
  yield* Effect.sync(
    () => IPC.RegisterInvokeHandler(
      "$onDidChangeLogLevel",
      ([Level]) => Effect.runPromise(OnDidChangeLogLevelEvent.Fire(Level))
    )
  );
  const CreateOpenExternalEffect = /* @__PURE__ */ __name((Target) => IPC.SendRequest("$openUri", [
    TypeConverter.URI.FromAPI(Target),
    { allowExternalSchemes: true }
  ]).pipe(Effect.map((Result) => !!Result)), "CreateOpenExternalEffect");
  const CreateAsExternalURIEffect = /* @__PURE__ */ __name((Target) => IPC.SendRequest("$asExternalUri", [
    TypeConverter.URI.FromAPI(Target)
  ]).pipe(Effect.map((Dto) => TypeConverter.URI.ToAPI(Dto))), "CreateAsExternalURIEffect");
  const GetAppRoot = /* @__PURE__ */ __name(() => {
    const AppRootUri = InitData.environment.appRoot;
    return AppRootUri?.scheme === Schemas.file ? AppRootUri.fsPath : void 0;
  }, "GetAppRoot");
  const TelemetryLevelValue = InitData.telemetryInfo.telemetryLevel ?? TelemetryLevel.NONE;
  const ServiceImplementation = {
    appName: InitData.environment.appName || "Cocoon Editor",
    appRoot: GetAppRoot(),
    appHost: InitData.environment.appHost || "desktop",
    uriScheme: InitData.environment.appUriScheme || "cocoon-code",
    language: InitData.environment.appLanguage || "en",
    machineId: InitData.telemetryInfo.machineId,
    sessionId: InitData.telemetryInfo.sessionId,
    isTrusted: InitData.workspace?.isTrusted ?? true,
    isRemote: !!InitData.remote?.isRemote,
    remoteName: InitData.remote?.authority?.split("+")[0],
    shell: process.platform === "win32" ? process.env["ComSpec"] || "pwsh.exe" : process.env["SHELL"] || "/bin/sh",
    uiKind: InitData.uiKind === 2 ? UIKind.Web : UIKind.Desktop,
    isNewAppInstall: InitData.isNewAppInstall === true,
    isBuilt: InitData.quality !== "development",
    get logLevel() {
      return Effect.runSync(Ref.get(LogLevelRef));
    },
    get isTelemetryEnabled() {
      return TelemetryLevelValue !== TelemetryLevel.NONE;
    },
    // Events
    onDidChangeLogLevel: OnDidChangeLogLevelEvent.event,
    onDidChangeShell: OnDidChangeShellEvent.event,
    onDidChangeTelemetryEnabled: OnDidChangeTelemetryEvent.event,
    // Injected Services/Objects
    clipboard: Clipboard,
    openExternal: /* @__PURE__ */ __name((Target) => Effect.runPromise(CreateOpenExternalEffect(Target)), "openExternal"),
    asExternalUri: /* @__PURE__ */ __name((Target) => Effect.runPromise(CreateAsExternalURIEffect(Target)), "asExternalUri")
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
