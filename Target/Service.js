import { Layer } from "effect";
import * as vscode from "vscode";
import { Live as LiveAPIDeprecation } from "./Service/APIDeprecation.js";
import { Live as LiveAuthentication } from "./Service/Authentication.js";
import { Live as LiveCancellation } from "./Service/Cancellation.js";
import { Live as LiveClipboard } from "./Service/Clipboard.js";
import { Live as LiveCommand } from "./Service/Command.js";
import { Live as LiveConfiguration } from "./Service/Configuration.js";
import { Live as LiveDebug } from "./Service/Debug.js";
import { Live as LiveDiagnostic } from "./Service/Diagnostic.js";
import { Live as LiveDialog } from "./Service/Dialog.js";
import { Live as LiveDocument } from "./Service/Document.js";
import { Live as LiveEnvironment } from "./Service/Environment.js";
import { Live as LiveExtension } from "./Service/Extension.js";
import { Live as LiveFileSystem } from "./Service/FileSystem.js";
import { Live as LiveFileSystemInformation } from "./Service/FileSystemInformation.js";
import { Live as LiveIPC } from "./Service/IPC.js";
import { Live as LiveLanguageFeature } from "./Service/LanguageFeature.js";
import { Live as LiveLocalization } from "./Service/Localization.js";
import { Live as LiveLog } from "./Service/Log.js";
import { Live as LiveMessage } from "./Service/Message.js";
import { Live as LiveProposedAPI } from "./Service/ProposedAPI.js";
import { Live as LiveQuickInput } from "./Service/QuickInput.js";
import { Live as LiveSecretStorage } from "./Service/SecretStorage.js";
import { Live as LiveStatusBar } from "./Service/StatusBar.js";
import { Live as LiveStorage } from "./Service/Storage.js";
import { Live as LiveStoragePath } from "./Service/StoragePath.js";
import { Live as LiveTask } from "./Service/Task.js";
import { Live as LiveTelemetry } from "./Service/Telemetry.js";
import { Live as LiveTreeView } from "./Service/TreeView.js";
import { Live as LiveWebViewPanel } from "./Service/WebViewPanel.js";
import { Live as LiveWindow } from "./Service/Window.js";
import { Live as LiveWorkSpace } from "./Service/WorkSpace.js";
import * as APIDeprecation from "./Service/APIDeprecation.js";
import * as Authentication from "./Service/Authentication.js";
import * as Cancellation from "./Service/Cancellation.js";
import * as Clipboard from "./Service/Clipboard.js";
import * as Command from "./Service/Command.js";
import * as Configuration from "./Service/Configuration.js";
import * as Debug from "./Service/Debug.js";
import * as Diagnostic from "./Service/Diagnostic.js";
import * as Dialog from "./Service/Dialog.js";
import * as Document from "./Service/Document.js";
import * as Environment from "./Service/Environment.js";
import * as Extension from "./Service/Extension.js";
import * as FileSystem from "./Service/FileSystem.js";
import * as FileSystemInformation from "./Service/FileSystemInformation.js";
import * as IPC from "./Service/IPC.js";
import * as LanguageFeature from "./Service/LanguageFeature.js";
import * as Localization from "./Service/Localization.js";
import * as Log from "./Service/Log.js";
import * as Message from "./Service/Message.js";
import * as ProposedAPI from "./Service/ProposedAPI.js";
import * as QuickInput from "./Service/QuickInput.js";
import * as SecretStorage from "./Service/SecretStorage.js";
import * as StatusBar from "./Service/StatusBar.js";
import * as Storage from "./Service/Storage.js";
import * as StoragePath from "./Service/StoragePath.js";
import * as Task from "./Service/Task.js";
import * as Telemetry from "./Service/Telemetry.js";
import * as TreeView from "./Service/TreeView.js";
import * as WebViewPanel from "./Service/WebViewPanel.js";
import * as Window from "./Service/Window.js";
import * as WorkSpace from "./Service/WorkSpace.js";
const AllServiceLayer = Layer.mergeAll(
  LiveAPIDeprecation,
  LiveAuthentication,
  LiveCancellation,
  LiveClipboard,
  LiveCommand,
  LiveConfiguration,
  LiveDebug,
  LiveDiagnostic,
  LiveDialog,
  LiveDocument,
  LiveEnvironment,
  LiveExtension,
  LiveFileSystem,
  LiveFileSystemInformation,
  LiveIPC,
  LiveLanguageFeature,
  LiveLocalization,
  LiveLog,
  LiveMessage,
  LiveProposedAPI,
  LiveQuickInput,
  LiveSecretStorage,
  LiveStatusBar,
  LiveStorage,
  LiveStoragePath,
  LiveTask,
  LiveTelemetry,
  LiveTreeView,
  LiveWebViewPanel,
  LiveWindow,
  LiveWorkSpace
);
export {
  APIDeprecation,
  AllServiceLayer,
  Authentication,
  Cancellation,
  Clipboard,
  Command,
  Configuration,
  Debug,
  Diagnostic,
  Dialog,
  Document,
  Environment,
  Extension,
  FileSystem,
  FileSystemInformation,
  IPC,
  LanguageFeature,
  Localization,
  Log,
  Message,
  ProposedAPI,
  QuickInput,
  SecretStorage,
  StatusBar,
  Storage,
  StoragePath,
  Task,
  Telemetry,
  TreeView,
  WebViewPanel,
  Window,
  WorkSpace,
  vscode
};
//# sourceMappingURL=Service.js.map
