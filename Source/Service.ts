// Re-export for type convenience

// --- Composed Layer ---

import { Layer } from "effect";

import { Live as LiveApiDeprecation } from "./ApiDeprecation.js";
import { Live as LiveAuthentication } from "./Authentication.js";
import { Live as LiveCancellation } from "./Cancellation.js";

/**
 * @module Service
 * @description This is the aggregator module for all services that implement the
 * `vscode` API surface for extensions. It re-exports their public interfaces
 * and provides a single, composed `AllServicesLayer` for convenience.
 */

// --- Re-exporting the full public API (Tag, Interface, Live Layer) for each service ---

export * as ApiDeprecation from "./ApiDeprecation.js";
export * as Authentication from "./Authentication.js";
export * as Cancellation from "./Cancellation.js";
export * as Clipboard from "./Clipboard.js";
export * as Commands from "./Commands.js";
export * as Configuration from "./Configuration.js";
export * as CustomEditor from "./CustomEditor.js";
export * as Debug from "./Debug.js";
export * as Diagnostics from "./Diagnostics.js";
export * as Dialog from "./Dialog.js";
export * as Documents from "./Documents.js";
export * as Env from "./Env.js";
export * as Extension from "./Extension.js";
export * as FileSystem from "./FileSystem.js";
export * as FileSystemInfo from "./FileSystemInfo.js";
export * as Ipc from "./Ipc.js";
export * as LanguageFeatures from "./LanguageFeatures.js";
export * as Localization from "./Localization.js";
export * as Log from "./Log.js"; // Simple log service
export * as Message from "./Message.js";
export * as ProposedApi from "./ProposedApi.js";
export * as QuickInput from "./QuickInput.js";
export * as SecretStorage from "./SecretStorage.js";
export * as StatusBar from "./StatusBar.js";
export * as Storage from "./Storage.js";
export * as Tasks from "./Tasks.js";
export * as Telemetry from "./Telemetry.js";
export * as TreeView from "./TreeView.js";
export * as Webview from "./Webview.js";
export * as WebviewPanel from "./WebviewPanel.js";
export * as Window from "./Window.js";
export * as Vscode from "vscode";

// ... import all other Live layers ...

/**
 * A single, composed layer that provides all services.
 * Note: This is a simplified composition. The final `AppLayer` in `Index.ts`
 * is responsible for providing the necessary configuration to layers like `Ipc`.
 */
export const AllServicesLayer = Layer.mergeAll(
	LiveApiDeprecation,
	LiveAuthentication,
	LiveCancellation,
	// ... and so on for every other service layer
);
