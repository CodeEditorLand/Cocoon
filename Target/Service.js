var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Layer } from "effect";
import { Live as APIDeprecationLive } from "./Service/APIDeprecation.js";
import { Live as AuthenticationLive } from "./Service/Authentication.js";
import { Live as CancellationLive } from "./Service/Cancellation.js";
import { Live as ClipboardLive } from "./Service/Clipboard.js";
import { Live as CommandLive } from "./Service/Command.js";
import { Live as ConfigurationLive } from "./Service/Configuration.js";
import { Live as DebugLive } from "./Service/Debug.js";
import { Live as DiagnosticLive } from "./Service/Diagnostic.js";
import { Live as DialogLive } from "./Service/Dialog.js";
import { Live as DocumentLive } from "./Service/Document.js";
import { Live as EnvironmentLive } from "./Service/Environment.js";
import { Live as ExtensionLive } from "./Service/Extension.js";
import { Live as FileSystemLive } from "./Service/FileSystem.js";
import { Live as FileSystemInformationLive } from "./Service/FileSystemInformation.js";
import { Live as IPCLive } from "./Service/IPC.js";
import { Live as LanguageFeatureLive } from "./Service/LanguageFeature.js";
import { Live as LocalizationLive } from "./Service/Localization.js";
import { Live as LogLive } from "./Service/Log.js";
import { Live as MessageLive } from "./Service/Message.js";
import { Live as ProposedAPILive } from "./Service/ProposedAPI.js";
import { Live as QuickInputLive } from "./Service/QuickInput.js";
import { Live as SecretStorageLive } from "./Service/SecretStorage.js";
import { Live as StatusBarLive } from "./Service/StatusBar.js";
import { Live as StorageLive } from "./Service/Storage.js";
import { Live as StoragePathLive } from "./Service/StoragePath.js";
import { Live as TaskLive } from "./Service/Task.js";
import { Live as TelemetryLive } from "./Service/Telemetry.js";
import { Live as TreeViewLive } from "./Service/TreeView.js";
import { Live as WebViewPanelLive } from "./Service/WebViewPanel.js";
import { Live as WindowLive } from "./Service/Window.js";
import { Live as WorkSpaceLive } from "./Service/WorkSpace.js";
const AllServiceLayer = /* @__PURE__ */ __name((Config) => {
  return Layer.mergeAll(
    APIDeprecationLive,
    AuthenticationLive(Config),
    CancellationLive,
    ClipboardLive(Config),
    CommandLive(Config),
    ConfigurationLive(Config),
    DebugLive(Config),
    DiagnosticLive(Config),
    DialogLive(Config),
    DocumentLive(Config),
    EnvironmentLive(Config),
    ExtensionLive,
    FileSystemLive(Config),
    FileSystemInformationLive(Config),
    IPCLive(Config),
    LanguageFeatureLive(Config),
    LocalizationLive(Config),
    LogLive,
    MessageLive(Config),
    ProposedAPILive,
    QuickInputLive(Config),
    SecretStorageLive(Config),
    StatusBarLive(Config),
    StorageLive(Config),
    StoragePathLive(Config),
    TaskLive(Config),
    TelemetryLive(Config),
    TreeViewLive(Config),
    WebViewPanelLive(Config),
    WindowLive(Config),
    WorkSpaceLive(Config)
  );
}, "AllServiceLayer");
var Service_default = AllServiceLayer;
export {
  Service_default as default
};
//# sourceMappingURL=Service.js.map
