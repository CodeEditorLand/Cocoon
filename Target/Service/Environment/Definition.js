var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref, Stream } from "effect";
import { Schemas } from "vs/base/common/network.js";
import { TelemetryLevel } from "vs/platform/telemetry/common/telemetry.js";
import { UIKind } from "vscode";
import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { Clipboard } from "../Clipboard.js";
import { InitData } from "../InitData.js";
import { IPC } from "../IPC.js";
const Definition = Effect.gen(function* (_) {
  const InitDataService = yield* _(InitData.Tag);
  const IPCService = yield* _(IPC.Tag);
  const ClipboardService = yield* _(Clipboard.Tag);
  const LogLevelRef = yield* _(
    Ref.make(InitDataService.logLevel)
  );
  const OnDidChangeLogLevelEvent = CreateEventStream();
  const OnDidChangeShellEvent = CreateEventStream();
  const OnDidChangeTelemetryEvent = CreateEventStream();
  IPCService.on(
    "$onDidChangeLogLevel",
    (level) => Effect.runPromise(OnDidChangeLogLevelEvent.Fire(level))
  );
  const OpenExternal = /* @__PURE__ */ __name((Target) => IPCService.SendRequest("$openUri", [
    TypeConverter.URIConverter.FromAPI(Target),
    { allowExternalSchemes: true }
  ]).pipe(Effect.map((result) => !!result)), "OpenExternal");
  const AsExternalURI = /* @__PURE__ */ __name((Target) => IPCService.SendRequest("$asExternalUri", [
    TypeConverter.URIConverter.FromAPI(Target)
  ]).pipe(Effect.map((dto) => TypeConverter.URIConverter.ToAPI(dto))), "AsExternalURI");
  const GetAppRoot = /* @__PURE__ */ __name(() => {
    const uri = InitDataService.environment.appRoot;
    return uri?.scheme === Schemas.file ? uri.fsPath : void 0;
  }, "GetAppRoot");
  const TelemetryLevelValue = InitDataService.telemetryInfo.telemetryLevel ?? TelemetryLevel.NONE;
  const ServiceImplementation = {
    appName: InitDataService.environment.appName || "Cocoon Editor",
    appRoot: GetAppRoot(),
    appHost: InitDataService.environment.appHost || "desktop",
    uriScheme: InitDataService.environment.appUriScheme || "cocoon-code",
    language: InitDataService.environment.appLanguage || "en",
    machineId: InitDataService.telemetryInfo.machineId,
    sessionId: InitDataService.telemetryInfo.sessionId,
    isTrusted: InitDataService.workspace?.isTrusted ?? true,
    isRemote: !!InitDataService.remote?.isRemote,
    remoteName: InitDataService.remote?.authority?.split("+")[0],
    shell: process.platform === "win32" ? process.env["ComSpec"] || "pwsh.exe" : process.env["SHELL"] || "/bin/sh",
    uiKind: InitDataService.uiKind === 2 ? UIKind.Web : UIKind.Desktop,
    isNewAppInstall: InitDataService.isNewAppInstall === true,
    isBuilt: InitDataService.quality !== "development",
    get logLevel() {
      return Ref.get(LogLevelRef).pipe(Effect.runSync);
    },
    get isTelemetryEnabled() {
      return TelemetryLevelValue !== TelemetryLevel.NONE && TelemetryLevelValue !== TelemetryLevel.OFF;
    },
    // Events
    onDidChangeLogLevel: OnDidChangeLogLevelEvent.Stream.pipe(
      Stream.toEvent
    ),
    onDidChangeShell: OnDidChangeShellEvent.Stream.pipe(Stream.toEvent),
    onDidChangeTelemetryEnabled: OnDidChangeTelemetryEvent.Stream.pipe(
      Stream.toEvent
    ),
    // Injected Services/Objects
    clipboard: ClipboardService,
    openExternal: /* @__PURE__ */ __name((target) => Effect.runPromise(OpenExternal(target)), "openExternal"),
    asExternalUri: /* @__PURE__ */ __name((target) => Effect.runPromise(AsExternalURI(target)), "asExternalUri")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
