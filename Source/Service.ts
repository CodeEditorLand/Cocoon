/**
 * @module Service
 * @description This is the aggregator module for all services that implement the
 * `vscode` API surface for extensions. It provides a single, composed `AllServiceLayer`
 * for convenience.
 */

import { Layer } from "effect";

import APIDeprecationLive from "./Service/APIDeprecation/Live.js";
import AuthenticationLive from "./Service/Authentication/Live.js";
import CancellationLive from "./Service/Cancellation/Live.js";
import ClipboardLive from "./Service/Clipboard/Live.js";
import CommandLive from "./Service/Command/Live.js";
import ConfigurationLive from "./Service/Configuration/Live.js";
import DebugLive from "./Service/Debug/Live.js";
import DiagnosticLive from "./Service/Diagnostic/Live.js";
import DialogLive from "./Service/Dialog/Live.js";
import DocumentLive from "./Service/Document/Live.js";
import EnvironmentLive from "./Service/Environment/Live.js";
import ExtensionLive from "./Service/Extension/Live.js";
import FileSystemLive from "./Service/FileSystem/Live.js";
import FileSystemInformationLive from "./Service/FileSystemInformation/Live.js";
import type IPCConfiguration from "./Service/IPC/Configuration.js";
import IPCLive from "./Service/IPC/Live.js";
import LanguageFeatureLive from "./Service/LanguageFeature/Live.js";
import LocalizationLive from "./Service/Localization/Live.js";
import LogLive from "./Service/Log/Live.js";
import MessageLive from "./Service/Message/Live.js";
import ProposedAPILive from "./Service/ProposedAPI/Live.js";
import QuickInputLive from "./Service/QuickInput/Live.js";
import SecretStorageLive from "./Service/SecretStorage/Live.js";
import StatusBarLive from "./Service/StatusBar/Live.js";
import StorageLive from "./Service/Storage/Live.js";
import StoragePathLive from "./Service/StoragePath/Live.js";
import TaskLive from "./Service/Task/Live.js";
import TelemetryLive from "./Service/Telemetry/Live.js";
import TreeViewLive from "./Service/TreeView/Live.js";
import WebViewPanelLive from "./Service/WebViewPanel/Live.js";
import WindowLive from "./Service/Window/Live.js";
import WorkSpaceLive from "./Service/WorkSpace/Live.js";

/**
 * A factory function that creates a single, composed layer that provides all services.
 * @param Config The IPC configuration required by many services.
 */
export default function (Config: {
	MountainAddress: string;
	CocoonAddress: string;
}) {
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
		WorkSpaceLive(Config),
	);
}
