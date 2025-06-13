/**
 * @module ConvertExtensionDataToDTO
 * @description Converts an `IExtensionDescription` object into a simplified
 * DTO, typically used for webview creation.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { IWebviewExtensionDescription } from "vs/workbench/contrib/webview/common/webview.js";

/**
 * Extracts the necessary identification and location information from an
 * `IExtensionDescription` object for passing to the `Mountain` host process.
 * This is specifically for identifying the extension that owns a webview.
 *
 * @param Extension The full description of the extension.
 * @returns A `IWebviewExtensionDescription` DTO containing the extension's ID and location URI.
 */
export function ConvertExtensionDataToDTO(
	Extension: IExtensionDescription,
): IWebviewExtensionDescription {
	return {
		id: Extension.identifier,
		location: Extension.extensionLocation,
	};
}
