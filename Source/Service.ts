/*
 * File: Cocoon/Source/Service.ts
 * Responsibility:
 * Modified: 2025-06-16 14:43:47 UTC
 * Dependency: ./Service/APIDeprecation.js, ./Service/Authentication.js, ./Service/Cancellation.js, ./Service/Clipboard.js, ./Service/Command.js, ./Service/Configuration.js, ./Service/Debug.js, ./Service/Diagnostic.js, ./Service/Dialog.js, ./Service/Document.js, ./Service/Environment.js, ./Service/Extension.js, ./Service/FileSystem.js, ./Service/FileSystemInformation.js, ./Service/IPC.js, ./Service/IPC/Configuration.js, ./Service/LanguageFeature.js, ./Service/Localization.js, ./Service/Log.js, ./Service/Message.js, ./Service/ProposedAPI.js, ./Service/QuickInput.js, ./Service/SecretStorage.js, ./Service/StatusBar.js, ./Service/Storage.js, ./Service/StoragePath.js, ./Service/Task.js, ./Service/Telemetry.js, ./Service/TreeView.js, ./Service/WebViewPanel.js, ./Service/Window.js, ./Service/WorkSpace.js, effect
 */

/**
 * @module Service
 * @description This is the aggregator module for all services that implement the
 * `vscode` API surface for extensions. It provides a single, composed `AllServiceLayer`
 * for convenience.
 */

import { Layer } from "effect";

import { APIDeprecationLive } from "./Service/APIDeprecation.js";
import { Live as AuthenticationLive } from "./Service/Authentication.js";
import { CancellationLive } from "./Service/Cancellation.js";
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
import type { IPCConfiguration } from "./Service/IPC/Configuration.js"; // FIX: Import the interface, not the Tag
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

/**
 * A factory function that creates a single, composed layer that provides all services.
 * @param Configuration The IPC configuration required by many services.
 * @returns A composed `Layer` containing all API services.
 */
const AllServiceLayer = (Configuration: IPCConfiguration) => {
	// FIX: Use the data interface
	return Layer.mergeAll(
		APIDeprecationLive,
		AuthenticationLive(Configuration),
		CancellationLive,
		ClipboardLive(Configuration),
		CommandLive(Configuration),
		ConfigurationLive(Configuration),
		DebugLive(Configuration),
		DiagnosticLive(Configuration),
		DialogLive(Configuration),
		DocumentLive(Configuration),
		EnvironmentLive(Configuration),
		ExtensionLive,
		FileSystemLive(Configuration),
		FileSystemInformationLive(Configuration),
		IPCLive(Configuration),
		LanguageFeatureLive(Configuration),
		LocalizationLive(Configuration),
		LogLive,
		MessageLive(Configuration),
		ProposedAPILive,
		QuickInputLive(Configuration),
		SecretStorageLive(Configuration),
		StatusBarLive(Configuration),
		StorageLive(Configuration),
		StoragePathLive(Configuration),
		TaskLive(Configuration),
		TelemetryLive(Configuration),
		TreeViewLive(Configuration),
		WebViewPanelLive(Configuration),
		WindowLive(Configuration),
		WorkSpaceLive(Configuration),
	);
};
export default AllServiceLayer;
