/**
 * @module WebView (TypeConverter)
 * @description Aggregates and exports type converter functions for the
 * `WebView` and `WebViewPanel` APIs.
 *
 * These functions are responsible for translating rich `vscode` API objects
 * into plain, serializable Data Transfer Objects (DTOs) suitable for
 * Inter-Process Communication (IPC) with the `Mountain` backend.
 */

export { ConvertContentOptionToDTO } from "./WebView/ConvertContentOptionToDTO.js";
export { ConvertExtensionDataToDTO } from "./WebView/ConvertExtensionDataToDTO.js";
export { ConvertPanelOptionToDTO } from "./WebView/ConvertPanelOptionToDTO.js";
export { ConvertShowOptionToDTO } from "./WebView/ConvertShowOptionToDTO.js";
