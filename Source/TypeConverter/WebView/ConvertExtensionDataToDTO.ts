/**
 * @module ConvertExtensionDataToDTO
 * @description Converts an `IExtensionDescription` object into a simplified
 * DTO, typically used for webview creation.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

// This type is not directly available, so we define a compatible shape.
interface IWebviewExtensionDescription {
	readonly id: IExtensionDescription["identifier"];
	readonly location: IExtensionDescription["extensionLocation"];
}

/**
 * Extracts the necessary identification and location information from an
 * `IExtensionDescription` object for passing to the `Mountain` host process.
 * This is specifically for identifying the extension that owns a webview.
 *
 * @param ExtensionDescription The full description of the extension.
 * @returns A `IWebviewExtensionDescription` DTO containing the extension's ID and location URI.
 */
const ConvertExtensionDataToDTO = (
	ExtensionDescription: IExtensionDescription,
	resource?: VSCode.Uri,
): IWebviewExtensionDescription => {
	return {
		id: ExtensionDescription.identifier,
		location: resource ?? ExtensionDescription.extensionLocation,
	};
};

export default ConvertExtensionDataToDTO;
