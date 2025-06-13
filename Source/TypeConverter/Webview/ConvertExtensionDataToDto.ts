/**
 * @module ConvertExtensionDataToDTO
 * @description Converts an `IExtensionDescription` object into a simplified
 * DTO, typically used for webview creation.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";

/**
 * Extracts the necessary identification and location information from an
 * `IExtensionDescription` object for passing to the `Mountain` host process.
 *
 * @param Extension - The full description of the extension.
 * @returns A simplified DTO containing the extension's ID and location URI.
 */
export const ConvertExtensionDataToDTO = (
	Extension: IExtensionDescription,
) => ({
	Id: Extension.identifier.value,
	Location: Extension.extensionLocation,
});
