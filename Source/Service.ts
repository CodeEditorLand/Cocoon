/**
 * @module Service
 * @description This is the aggregator module for all services that implement the
 * `vscode` API surface for extensions. It re-exports their public interfaces
 * and provides a single, composed `AllServiceLayer` for convenience.
 */

import { Layer } from "effect";
import type * as vscode from "vscode";

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
import {
	Live as LiveIPC,
	type Configuration as IPCConfiguration,
} from "./Service/IPC.js";
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

export { vscode };

// --- Re-exporting the full public API (Tag, Interface, Live Layer) for each service ---
export * as APIDeprecation from "./Service/APIDeprecation.js";
export * as Authentication from "./Service/Authentication.js";
export * as Cancellation from "./Service/Cancellation.js";
export * as Clipboard from "./Service/Clipboard.js";
export * as Command from "./Service/Command.js";
export * as Configuration from "./Service/Configuration.js";
export * as Debug from "./Service/Debug.js";
export * as Diagnostic from "./Service/Diagnostic.js";
export * as Dialog from "./Service/Dialog.js";
export * as Document from "./Service/Document.js";
export * as Environment from "./Service/Environment.js";
export * as Extension from "./Service/Extension.js";
export * as FileSystem from "./Service/FileSystem.js";
export * as FileSystemInformation from "./Service/FileSystemInformation.js";
export * as IPC from "./Service/IPC.js";
export * as LanguageFeature from "./Service/LanguageFeature.js";
export * as Localization from "./Service/Localization.js";
export * as Log from "./Service/Log.js";
export * as Message from "./Service/Message.js";
export * as ProposedAPI from "./Service/ProposedAPI.js";
export * as QuickInput from "./Service/QuickInput.js";
export * as SecretStorage from "./Service/SecretStorage.js";
export * as StatusBar from "./Service/StatusBar.js";
export * as Storage from "./Service/Storage.js";
export * as StoragePath from "./Service/StoragePath.js";
export * as Task from "./Service/Task.js";
export * as Telemetry from "./Service/Telemetry.js";
export * as TreeView from "./Service/TreeView.js";
export * as WebViewPanel from "./Service/WebViewPanel.js";
export * as Window from "./Service/Window.js";
export * as WorkSpace from "./Service/WorkSpace.js";

/**
 * A factory function that creates a single, composed layer that provides all services.
 * @param Config The IPC configuration required by many services.
 */
export const AllServiceLayer = (Config: IPCConfiguration) =>
	Layer.mergeAll(
		LiveAPIDeprecation,
		LiveAuthentication(Config),
		LiveCancellation,
		LiveClipboard(Config),
		LiveCommand(Config),
		LiveConfiguration(Config),
		LiveDebug(Config),
		LiveDiagnostic(Config),
		LiveDialog(Config),
		LiveDocument(Config),
		LiveEnvironment,
		LiveExtension,
		LiveFileSystem(Config),
		LiveFileSystemInformation(Config),
		LiveIPC(Config),
		LiveLanguageFeature(Config),
		LiveLocalization(Config),
		LiveLog,
		LiveMessage(Config),
		LiveProposedAPI,
		LiveQuickInput(Config),
		LiveSecretStorage(Config),
		LiveStatusBar(Config),
		LiveStorage(Config),
		LiveStoragePath,
		LiveTask(Config),
		LiveTelemetry(Config),
		LiveTreeView(Config),
		LiveWebViewPanel(Config),
		LiveWindow(Config),
		LiveWorkSpace(Config),
	);
