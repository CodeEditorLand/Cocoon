var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref, Stream } from "effect";
import { Schemas } from "vs/base/common/network.js";
import { TelemetryLevel } from "vs/platform/telemetry/common/telemetry.js";
import { UIKind } from "vscode";
import * as TypeConverter from "../../TypeConverter/mod.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { ClipboardProvider } from "../Clipboard/mod.js";
import { InitDataService } from "../InitData.js";
import { IpcProvider } from "../Ipc/mod.js";
const Definition = Effect.gen(function* (_) {
  const InitData = yield* _(InitDataService);
  const Ipc = yield* _(IpcProvider.Tag);
  const Clipboard = yield* _(ClipboardProvider.Tag);
  const LogLevelRef = yield* _(Ref.make(InitData.logLevel));
  const OnDidChangeLogLevelEvent = CreateEventStream();
  const OnDidChangeShellEvent = CreateEventStream();
  const OnDidChangeTelemetryEvent = CreateEventStream();
  Ipc.RegisterInvokeHandler(
    "$acceptShellChanged",
    ([shell]) => OnDidChangeShellEvent.Fire(shell).pipe(Effect.runPromise)
  );
  Ipc.RegisterInvokeHandler(
    "$acceptLogLevelChanged",
    ([level]) => Ref.set(LogLevelRef, level).pipe(
      Effect.flatMap(() => OnDidChangeLogLevelEvent.Fire(level)),
      Effect.runPromise
    )
  );
  const OpenExternalEffect = /* @__PURE__ */ __name((Target) => Ipc.SendRequest("$openUri", [
    TypeConverter.Uri.fromApi(Target),
    { allowExternalSchemes: true }
  ]).pipe(Effect.map((result) => !!result)), "OpenExternalEffect");
  const AsExternalUriEffect = /* @__PURE__ */ __name((Target) => Ipc.SendRequest("$asExternalUri", [
    TypeConverter.Uri.fromApi(Target)
  ]).pipe(Effect.map((dto) => TypeConverter.Uri.toApi(dto))), "AsExternalUriEffect");
  const GetAppRoot = /* @__PURE__ */ __name(() => {
    const uri = InitData.environment.appRoot;
    return uri?.scheme === Schemas.file ? uri.fsPath : void 0;
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
    isTrusted: InitData.workspace?.trusted ?? true,
    isRemote: !!InitData.remote?.isRemote,
    remoteName: InitData.remote?.authority?.split("+")[0],
    shell: process.platform === "win32" ? process.env["ComSpec"] || "pwsh.exe" : process.env["SHELL"] || "/bin/sh",
    uiKind: InitData.uiKind === 2 ? UIKind.Web : UIKind.Desktop,
    isNewAppInstall: InitData.isNewAppInstall === true,
    isBuilt: InitData.quality !== "development",
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
    clipboard: Clipboard,
    openExternal: /* @__PURE__ */ __name((target) => Effect.runPromise(OpenExternalEffect(target)), "openExternal"),
    asExternalUri: /* @__PURE__ */ __name((target) => Effect.runPromise(AsExternalUriEffect(target)), "asExternalUri")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
