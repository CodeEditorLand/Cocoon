

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
 * @param ExtensionDescription The description of the extension that owns the webview.
 * @param Options The `vscode.WebviewOptions` provided by the extension.
 * @returns A serializable DTO representing the webview's content options.
 */
export default (
	ExtensionDescription: IExtensionDescription,
	Options: VSCode.WebviewOptions,
) => {
	return {
		enableCommandUris: Options.enableCommandUris,
		enableScripts: Options.enableScripts,
		enableForms: Options.enableForms,
		localResourceRoots: Options.localResourceRoots ?? [
			ExtensionDescription.extensionLocation,
		],
		portMapping: Options.portMapping,
	};
};
