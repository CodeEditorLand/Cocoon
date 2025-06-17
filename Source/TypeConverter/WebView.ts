/*
 * File: Cocoon/Source/TypeConverter/WebView.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ./WebView/ConvertContentOptionToDTO.js, ./WebView/ConvertExtensionDataToDTO.js, ./WebView/ConvertPanelOptionToDTO.js, ./WebView/ConvertShowOptionToDTO.js
 * Export: WebView
 */

/**
 * @module WebView (TypeConverter)
 * @description Aggregates and exports type converter functions for the
 * `WebView` and `WebViewPanel` APIs.
 *
 * These functions are responsible for translating rich `vscode` API objects
 * into plain, serializable Data Transfer Objects (DTOs) suitable for
 * Inter-Process Communication (IPC) with the `Mountain` backend.
 */

import ConvertContentOptionToDTO from "./WebView/ConvertContentOptionToDTO.js";
import ConvertExtensionDataToDTO from "./WebView/ConvertExtensionDataToDTO.js";
import ConvertPanelOptionToDTO from "./WebView/ConvertPanelOptionToDTO.js";
import ConvertShowOptionToDTO from "./WebView/ConvertShowOptionToDTO.js";

export const WebView = {
	ConvertContentOptionToDTO,
	ConvertExtensionDataToDTO,
	ConvertPanelOptionToDTO,
	ConvertShowOptionToDTO,
};
