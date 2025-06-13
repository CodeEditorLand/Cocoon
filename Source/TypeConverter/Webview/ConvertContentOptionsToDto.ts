/**
 * @module ConvertContentOptionToDTO
 * @description Converts a `vscode.WebViewOption` object into a serializable DTO.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

/**
 * Converts the `vscode.WebViewOption` object into a plain DTO suitable
 * for sending over the RPC channel to `Mountain`.
 *
 * It includes security-relevant options and defines the root paths for local
 * resources, defaulting to the extension's location if not otherwise specified.
 *
 * @param Extension - The description of the extension that owns the webview.
 * @param Option - The `vscode.WebViewOption` provided by the extension.
 * @returns A serializable DTO representing the webview's content options.
 */
export const ConvertContentOptionToDTO = (
	Extension: IExtensionDescription,
	Option: VSCode.WebViewOption,
) => ({
	EnableCommandUri: Option.enableCommandUris,
	EnableScript: Option.enableScripts,
	EnableForm: Option.enableForms,
	LocalResourceRoot: Option.localResourceRoots ?? [
		Extension.extensionLocation,
	],
	// Note: Port mappings would be handled here if implemented.
});
