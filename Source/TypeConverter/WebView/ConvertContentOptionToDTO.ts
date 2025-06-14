/**
 * @module ConvertContentOptionToDTO
 * @description Converts a `vscode.WebviewOptions` object into a serializable DTO.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

/**
 * Converts the `vscode.WebviewOptions` object into a plain DTO suitable
 * for sending over the RPC channel to `Mountain`.
 *
 * It includes security-relevant options and defines the root paths for local
 * resources, defaulting to the extension's location if not otherwise specified.
 *
 * @param Extension The description of the extension that owns the webview.
 * @param Option The `vscode.WebviewOptions` provided by the extension.
 * @returns A serializable DTO representing the webview's content options.
 */
export default function (
	Extension: IExtensionDescription,
	Option: VSCode.WebviewOptions,
) {
	return {
		enableCommandUris: Option.enableCommandUris,
		enableScripts: Option.enableScripts,
		enableForms: Option.enableForms,
		localResourceRoots: Option.localResourceRoots ?? [
			Extension.extensionLocation,
		],
		portMappings: Option.portMapping,
	};
}
