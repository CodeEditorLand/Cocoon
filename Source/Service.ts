// Re-export for type convenience

// --- Composed Layer ---

import { Layer } from "effect";

import { Live as LiveApiDeprecation } from "./ApiDeprecation/mod.js";
import { Live as LiveAuthentication } from "./Authentication/mod.js";
import { Live as LiveCancellation } from "./Cancellation/mod.js";

/**
 * @module Service
 * @description This is the aggregator module for all services that implement the
 * `vscode` API surface for extensions. It re-exports their public interfaces
 * and provides a single, composed `AllServicesLayer` for convenience.
 */

// --- Re-exporting the full public API (Tag, Interface, Live Layer) for each service ---

export * as ApiDeprecation from "./ApiDeprecation/mod.js";
export * as Authentication from "./Authentication/mod.js";
export * as Cancellation from "./Cancellation/mod.js";
export * as Clipboard from "./Clipboard/mod.js";
export * as Commands from "./Commands/mod.js";
export * as Configuration from "./Configuration/mod.js";
export * as CustomEditor from "./CustomEditor/mod.js";
export * as Debug from "./Debug/mod.js";
export * as Diagnostics from "./Diagnostics/mod.js";
export * as Dialog from "./Dialog/mod.js";
export * as Documents from "./Documents/mod.js";
export * as Env from "./Env/mod.js";
export * as Extension from "./Extension/mod.js";
export * as FileSystem from "./FileSystem/mod.js";
export * as FileSystemInfo from "./FileSystemInfo/mod.js";
export * as Ipc from "./Ipc/mod.js";
export * as LanguageFeatures from "./LanguageFeatures/mod.js";
export * as Localization from "./Localization/mod.js";
export * as Log from "./Log.js"; // Simple log service
export * as Message from "./Message/mod.js";
export * as ProposedApi from "./ProposedApi.js";
export * as QuickInput from "./QuickInput/mod.js";
export * as SecretStorage from "./SecretStorage/mod.js";
export * as StatusBar from "./StatusBar/mod.js";
export * as Storage from "./Storage/mod.js";
export * as Tasks from "./Tasks/mod.js";
export * as Telemetry from "./Telemetry.js";
export * as TreeView from "./TreeView/mod.js";
export * as Webview from "./Webview/mod.js";
export * as WebviewPanel from "./WebviewPanel/mod.js";
export * as Window from "./Window/mod.js";
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
