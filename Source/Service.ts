/*
 * File: Cocoon/Source/Service.ts
 * Responsibility: The main barrel (aggregator) file for all API-level services.
 * Modified: 2025-06-17 10:52:55 UTC
 */

/**
 * @module Service
 * @description This module aggregates and re-exports all services that implement
 * or support the public `vscode.*` API surface, such as commands, file system
 * operations, and window management.
 * This file uses explicit, aliased imports and exports to prevent name collisions.
 */

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
import * as InitData from "./Service/InitData.js";
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

// --- Live Layers ---
const APIDeprecationLive = APIDeprecation.APIDeprecationLive;
const AuthenticationLive = Authentication.Live;
const CancellationLive = Cancellation.Live;
const ClipboardLive = Clipboard.Live;
const CommandLive = Command.Live;
const ConfigurationLive = Configuration.Live;
const DebugLive = Debug.Live;
const DiagnosticLive = Diagnostic.Live;
const DialogLive = Dialog.Live;
const DocumentLive = Document.Live;
const EnvironmentLive = Environment.Live;
const ExtensionLive = Extension.Live;
const FileSystemLive = FileSystem.Live;
const FileSystemInformationLive = FileSystemInformation.Live;
const InitDataLive = InitData.InitDataLayer; // Note the different export name from its barrel
const IPCLive = IPC.Live;
const LanguageFeatureLive = LanguageFeature.Live;
const LocalizationLive = Localization.Live;
const LogLive = Log.Live;
const MessageLive = Message.Live;
const ProposedAPILive = ProposedAPI.Live;
const QuickInputLive = QuickInput.Live;
const SecretStorageLive = SecretStorage.Live;
const StatusBarLive = StatusBar.Live;
const StorageLive = Storage.Live;
const StoragePathLive = StoragePath.Live;
const TaskLive = Task.Live;
const TelemetryLive = Telemetry.Live;
const TreeViewLive = TreeView.Live;
const WebViewPanelLive = WebViewPanel.Live;
const WindowLive = Window.Live;
const WorkSpaceLive = WorkSpace.Live;

// --- Service Tags ---
const APIDeprecationService = APIDeprecation.Service;
const AuthenticationService = Authentication.Service;
const CancellationService = Cancellation.Service;
const ClipboardService = Clipboard.Service;
const CommandService = Command.Service;
const ConfigurationService = Configuration.Service;
const DebugService = Debug.Service;
const DiagnosticService = Diagnostic.Service;
const DialogService = Dialog.Service;
const DocumentService = Document.Service;
const EnvironmentService = Environment.Service;
const ExtensionService = Extension.Service;
const FileSystemService = FileSystem.Service;
const FileSystemInformationService = FileSystemInformation.Service;
const InitDataService = InitData.Service;
const IPCService = IPC.Service;
const LanguageFeatureService = LanguageFeature.Service;
const LocalizationService = Localization.Service;
const LogService = Log.Service;
const MessageService = Message.Service;
const ProposedAPIService = ProposedAPI.Service;
const QuickInputService = QuickInput.Service;
const SecretStorageService = SecretStorage.Service;
const StatusBarService = StatusBar.Service;
const StorageService = Storage.Service;
const StoragePathService = StoragePath.Service;
const TaskService = Task.Service;
const TelemetryService = Telemetry.Service;
const TreeViewService = TreeView.Service;
const WebViewPanelService = WebViewPanel.Service;
const WindowService = Window.Service;
const WorkSpaceService = WorkSpace.Service;

export {
	// Live Layers
	APIDeprecationLive,
	AuthenticationLive,
	CancellationLive,
	ClipboardLive,
	CommandLive,
	ConfigurationLive,
	DebugLive,
	DiagnosticLive,
	DialogLive,
	DocumentLive,
	EnvironmentLive,
	ExtensionLive,
	FileSystemLive,
	FileSystemInformationLive,
	InitDataLive,
	IPCLive,
	LanguageFeatureLive,
	LocalizationLive,
	LogLive,
	MessageLive,
	ProposedAPILive,
	QuickInputLive,
	SecretStorageLive,
	StatusBarLive,
	StorageLive,
	StoragePathLive,
	TaskLive,
	TelemetryLive,
	TreeViewLive,
	WebViewPanelLive,
	WindowLive,
	WorkSpaceLive,
	// Service Tags
	APIDeprecationService,
	AuthenticationService,
	CancellationService,
	ClipboardService,
	CommandService,
	ConfigurationService,
	DebugService,
	DiagnosticService,
	DialogService,
	DocumentService,
	EnvironmentService,
	ExtensionService,
	FileSystemService,
	FileSystemInformationService,
	InitDataService,
	IPCService,
	LanguageFeatureService,
	LocalizationService,
	LogService,
	MessageService,
	ProposedAPIService,
	QuickInputService,
	SecretStorageService,
	StatusBarService,
	StorageService,
	StoragePathService,
	TaskService,
	TelemetryService,
	TreeViewService,
	WebViewPanelService,
	WindowService,
	WorkSpaceService,
};
