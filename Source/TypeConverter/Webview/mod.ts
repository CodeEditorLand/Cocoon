/**
 * @module Webview (TypeConverter)
 * @description Aggregates and exports type converter functions for the
 * `Webview` and `WebviewPanel` APIs.
 *
 * These functions are responsible for translating rich `vscode` API objects
 * into plain, serializable Data Transfer Objects (DTOs) suitable for
 * Inter-Process Communication (IPC) with the `Mountain` backend.
 */

export { ConvertContentOptionsToDto } from "./ConvertContentOptionsToDto.js";
export { ConvertExtensionDataToDto } from "./ConvertExtensionDataToDto.js";
export { ConvertPanelOptionsToDto } from "./ConvertPanelOptionsToDto.js";
export { ConvertShowOptionsToDto } from "./ConvertShowOptionsToDto.js";
