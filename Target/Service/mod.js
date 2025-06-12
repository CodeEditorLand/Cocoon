import { Layer } from "effect";
import { Live as LiveApiDeprecation } from "./ApiDeprecation/mod.js";
import { Live as LiveAuthentication } from "./Authentication/mod.js";
import { Live as LiveCancellation } from "./Cancellation/mod.js";
import * as ApiDeprecation from "./ApiDeprecation/mod.js";
import * as Authentication from "./Authentication/mod.js";
import * as Cancellation from "./Cancellation/mod.js";
import * as Clipboard from "./Clipboard/mod.js";
import * as Commands from "./Commands/mod.js";
import * as Configuration from "./Configuration/mod.js";
import * as CustomEditor from "./CustomEditor/mod.js";
import * as Debug from "./Debug/mod.js";
import * as Diagnostics from "./Diagnostics/mod.js";
import * as Dialog from "./Dialog/mod.js";
import * as Documents from "./Documents/mod.js";
import * as Env from "./Env/mod.js";
import * as Extension from "./Extension/mod.js";
import * as FileSystem from "./FileSystem/mod.js";
import * as FileSystemInfo from "./FileSystemInfo/mod.js";
import * as Ipc from "./Ipc/mod.js";
import * as LanguageFeatures from "./LanguageFeatures/mod.js";
import * as Localization from "./Localization/mod.js";
import * as Log from "./Log.js";
import * as Message from "./Message/mod.js";
import * as ProposedApi from "./ProposedApi.js";
import * as QuickInput from "./QuickInput/mod.js";
import * as SecretStorage from "./SecretStorage/mod.js";
import * as StatusBar from "./StatusBar/mod.js";
import * as Storage from "./Storage/mod.js";
import * as Tasks from "./Tasks/mod.js";
import * as Telemetry from "./Telemetry.js";
import * as TreeView from "./TreeView/mod.js";
import * as Webview from "./Webview/mod.js";
import * as WebviewPanel from "./WebviewPanel/mod.js";
import * as Window from "./Window/mod.js";
import * as Vscode from "vscode";
const AllServicesLayer = Layer.mergeAll(
  LiveApiDeprecation,
  LiveAuthentication,
  LiveCancellation
  // ... and so on for every other service layer
);
export {
  AllServicesLayer,
  ApiDeprecation,
  Authentication,
  Cancellation,
  Clipboard,
  Commands,
  Configuration,
  CustomEditor,
  Debug,
  Diagnostics,
  Dialog,
  Documents,
  Env,
  Extension,
  FileSystem,
  FileSystemInfo,
  Ipc,
  LanguageFeatures,
  Localization,
  Log,
  Message,
  ProposedApi,
  QuickInput,
  SecretStorage,
  StatusBar,
  Storage,
  Tasks,
  Telemetry,
  TreeView,
  Vscode,
  Webview,
  WebviewPanel,
  Window
};
//# sourceMappingURL=mod.js.map
