/**
 * @module ConvertContentOptionToDTO
 * @description Converts a `vscode.WebviewOptions` object into a serializable DTO.
 */

import type { IExtensionDescription } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/platform/extensions/common/extensions.js";

import type * as VSCode from "vscode";

/**
 * @description Converts the `vscode.WebviewOptions` object into a plain DTO suitable
 * for sending over the RPC channel to `Mountain`.
 * @param ExtensionDescription The description of the extension that owns the webview.
 * @param Options The `vscode.WebviewOptions` provided by the extension.
 * @returns A serializable DTO representing the webview's content options.
 */
export const ConvertContentOptionToDTO = (
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
