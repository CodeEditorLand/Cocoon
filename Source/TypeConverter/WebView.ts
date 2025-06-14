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

export default {
	ConvertContentOptionToDTO,
	ConvertExtensionDataToDTO,
	ConvertPanelOptionToDTO,
	ConvertShowOptionToDTO,
};
