var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Schemas } from "vs/base/common/network.js";
import { UIKind } from "vscode";
import URIConverter from "../../TypeConverter/Main/URI.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import ClipboardService from "../Clipboard/Service.js";
import InitDataService from "../InitData/Service.js";
import IPCService from "../IPC/Service.js";
const TelemetryLevel = {
  NONE: 0,
  CRASH: 1,
  ERROR: 2,
  USAGE: 3
};
var Definition_default = Effect.gen(function* () {
  const InitData = yield* InitDataService;
  const IPC = yield* IPCService;
  const Clipboard = yield* ClipboardService;
  const LogLevelRef = yield* Ref.make(
    InitData.logLevel
  );
  const { event: onDidChangeLogLevel, Fire: fireLogLevel } = CreateEventStream();
  const { event: onDidChangeShell } = CreateEventStream();
  const { event: onDidChangeTelemetryEnabled } = CreateEventStream();
  yield* Effect.sync(
    () => IPC.RegisterInvokeHandler(
      "$onDidChangeLogLevel",
      ([Level]) => Effect.runPromise(fireLogLevel(Level))
    )
  );
  const CreateOpenExternalEffect = /* @__PURE__ */ __name((Target) => IPC.SendRequest("$openUri", [
    URIConverter.FromAPI(Target),
    { allowExternalSchemes: true }
  ]).pipe(Effect.map((Result) => !!Result)), "CreateOpenExternalEffect");
  const CreateAsExternalURIEffect = /* @__PURE__ */ __name((Target) => IPC.SendRequest("$asExternalUri", [
    URIConverter.FromAPI(Target)
  ]).pipe(Effect.map((Dto) => URIConverter.ToAPI(Dto))), "CreateAsExternalURIEffect");
  const GetAppRoot = /* @__PURE__ */ __name(() => {
    const AppRootUri = InitData.environment.appRoot;
    return AppRootUri?.scheme === Schemas.file ? AppRootUri.fsPath : void 0;
  }, "GetAppRoot");
  const TelemetryLevelValue = InitData.logLevel ?? TelemetryLevel.NONE;
  const isTrusted = InitData.workspace ? InitData.workspace.isTrusted ?? true : true;
  const ServiceImplementation = {
    appName: InitData.environment.appName || "Cocoon Editor",
    appRoot: GetAppRoot(),
    appHost: InitData.environment.appHost || "desktop",
    uriScheme: InitData.environment.appUriScheme || "cocoon-code",
    language: InitData.environment.appLanguage || "en",
    machineId: InitData.telemetryInfo.machineId,
    sessionId: InitData.telemetryInfo.sessionId,
    isTrusted,
    isRemote: !!InitData.remote?.isRemote,
    remoteName: InitData.remote?.authority?.split("+")[0],
    shell: process.platform === "win32" ? process.env["ComSpec"] || "pwsh.exe" : process.env["SHELL"] || "/bin/sh",
    uiKind: InitData.uiKind === 2 ? UIKind.Web : UIKind.Desktop,
    isNewAppInstall: Date.now() - new Date(InitData.telemetryInfo.firstSessionDate).getTime() < 1e3 * 60 * 60 * 24,
    isBuilt: InitData.quality !== "development",
    get logLevel() {
      return Effect.runSync(Ref.get(LogLevelRef));
    },
    get isTelemetryEnabled() {
      return TelemetryLevelValue >= TelemetryLevel.USAGE;
    },
    // Events
    onDidChangeLogLevel,
    onDidChangeShell,
    onDidChangeTelemetryEnabled,
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
