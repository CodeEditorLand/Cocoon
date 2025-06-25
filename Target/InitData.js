var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { LogLevel, UIKind } from "vscode";
const DummyInitData = {
  version: "1.85.0",
  quality: "stable",
  commit: "dev",
  parentPid: 0,
  environment: {
    isExtensionDevelopmentDebug: false,
    appName: "Cocoon",
    appHost: "desktop",
    appLanguage: "en",
    isExtensionTelemetryLoggingOnly: false,
    appUriScheme: "cocoon-code",
    globalStorageHome: {},
    workspaceStorageHome: {}
  },
  workspace: null,
  extensions: {
    versionId: 0,
    allExtensions: [],
    activationEvents: {},
    myExtensions: []
  },
  telemetryInfo: {
    sessionId: "",
    machineId: "",
    sqmId: "",
    devDeviceId: "",
    firstSessionDate: (/* @__PURE__ */ new Date()).toISOString()
  },
  logLevel: LogLevel.Info,
  loggers: [],
  logsLocation: {},
  autoStart: false,
  remote: { isRemote: false, authority: void 0, connectionData: null },
  consoleForward: { includeStack: false, logNative: false },
  uiKind: UIKind.Desktop
};
class InitDataService extends Effect.Service()(
  "Service/InitData",
  {
    sync: /* @__PURE__ */ __name(() => DummyInitData, "sync")
  }
) {
  static {
    __name(this, "InitDataService");
  }
}
export {
  InitDataService
};
//# sourceMappingURL=InitData.js.map
