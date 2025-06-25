var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Schemas } from "vs/base/common/network.js";
import {
  UIKind
} from "vscode";
import { ToAPI as UriToApi } from "./TypeConverter/Main/URI.js";
import { CreateEventStream } from "./Utility/CreateEventStream.js";
import { ClipboardService } from "./Clipboard.js";
import { InitDataService } from "./InitData.js";
import { IPCService } from "./IPC.js";
import { TelemetryLevel } from "vs/platform/telemetry/common/telemetry.js";
class EnvironmentService extends Effect.Service()(
  "Service/Environment",
  {
    effect: Effect.gen(function* () {
      const InitData = yield* InitDataService;
      const IPC = yield* IPCService;
      const Clipboard = yield* ClipboardService;
      const LogLevelRef = yield* Ref.make(
        InitData.logLevel
      );
      const { event: OnDidChangeLogLevel, Fire: FireLogLevel } = CreateEventStream();
      const { event: OnDidChangeShell } = CreateEventStream();
      const { event: OnDidChangeTelemetryEnabled } = CreateEventStream();
      IPC.RegisterInvokeHandler(
        "$onDidChangeLogLevel",
        ([Level]) => Effect.runPromise(FireLogLevel(Level))
      );
      const OpenExternal = /* @__PURE__ */ __name((Target) => IPC.SendRequest("$openUri", [
        Target.toJSON(),
        { allowExternalSchemes: true }
      ]).pipe(Effect.map((Result) => !!Result)), "OpenExternal");
      const AsExternalUri = /* @__PURE__ */ __name((Target) => IPC.SendRequest("$asExternalUri", [Target.toJSON()]).pipe(
        Effect.map((Dto) => UriToApi(Dto))
      ), "AsExternalUri");
      const GetAppRoot = /* @__PURE__ */ __name(() => {
        const AppRootUri = InitData.environment.appRoot;
        return AppRootUri?.scheme === Schemas.file ? AppRootUri.fsPath : void 0;
      }, "GetAppRoot");
      const TelemetryLevelValue = InitData.logLevel ?? TelemetryLevel.NONE;
      const IsTrusted = InitData.workspace ? InitData.workspace.isTrusted ?? true : true;
      const ServiceImplementation = {
        appName: InitData.environment.appName || "Cocoon Editor",
        appRoot: GetAppRoot(),
        appHost: InitData.environment.appHost || "desktop",
        uriScheme: InitData.environment.appUriScheme || "cocoon-code",
        language: InitData.environment.appLanguage || "en",
        machineId: InitData.telemetryInfo.machineId,
        sessionId: InitData.telemetryInfo.sessionId,
        isTrusted: IsTrusted,
        isRemote: !!InitData.remote?.isRemote,
        remoteName: InitData.remote?.authority?.split("+")[0],
        shell: process.platform === "win32" ? process.env["ComSpec"] || "pwsh.exe" : process.env["SHELL"] || "/bin/sh",
        uiKind: InitData.uiKind === 2 ? UIKind.Web : UIKind.Desktop,
        isNewAppInstall: Date.now() - new Date(
          InitData.telemetryInfo.firstSessionDate
        ).getTime() < 1e3 * 60 * 60 * 24,
        isBuilt: InitData.quality !== "development",
        get logLevel() {
          return Effect.runSync(Ref.get(LogLevelRef));
        },
        get isTelemetryEnabled() {
          return TelemetryLevelValue >= TelemetryLevel.USAGE;
        },
        onDidChangeLogLevel: OnDidChangeLogLevel,
        onDidChangeShell: OnDidChangeShell,
        onDidChangeTelemetryEnabled: OnDidChangeTelemetryEnabled,
        clipboard: Clipboard,
        openExternal: /* @__PURE__ */ __name((Target) => Effect.runPromise(OpenExternal(Target)), "openExternal"),
        asExternalUri: /* @__PURE__ */ __name((Target) => Effect.runPromise(AsExternalUri(Target)), "asExternalUri")
      };
      return ServiceImplementation;
    })
  }
) {
  static {
    __name(this, "EnvironmentService");
  }
}
export {
  EnvironmentService
};
//# sourceMappingURL=Environment.js.map
