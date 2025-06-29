/**
 * @module OpenDialogOption
 * @description Converts `vscode.OpenDialogOptions` to its DTO representation.
 */

import type { OpenDialogOptions } from "vscode";

import { SerializeFilters } from "./Filter.js";

/**
 * @description Converts `vscode.OpenDialogOptions` to a plain DTO for IPC.
 * @param Options The `OpenDialogOptions` to convert.
 * @returns The serializable DTO.
 */
export const ToDTO = (Options?: OpenDialogOptions) => {
	if (!Options) {
		return undefined;
	}
	return {
		...Options,
		defaultUri: Options.defaultUri?.toJSON(),
		filters: SerializeFilters(Options.filters),
	};
};
