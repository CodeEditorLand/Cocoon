/**
 * @module SaveDialogOption
 * @description Converts `vscode.SaveDialogOptions` to its DTO representation.
 */

import type { SaveDialogOptions } from "vscode";

import { SerializeFilters } from "../../Filter.js";

/**
 * @description Converts `vscode.SaveDialogOptions` to a plain DTO for IPC.
 * @param Options The `SaveDialogOptions` to convert.
 * @returns The serializable DTO.
 */
export const ToDTO = (Options?: SaveDialogOptions) => {
	if (!Options) {
		return undefined;
	}
	return {
		...Options,
		defaultUri: Options.defaultUri?.toJSON(),
		filters: SerializeFilters(Options.filters),
	};
};
