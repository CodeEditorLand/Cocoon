/**
 * @module MarkdownString (Main/TypeConverter)
 * @description Converts between `vscode.MarkdownString` and its DTO representation.
 */

import type { IMarkdownString } from "vs/base/common/htmlContent.js";

import { MarkdownString, URI } from "../../Type/ExtHostTypes.js";

/**
 * Converts a `vscode.MarkdownString` object into a plain DTO for IPC.
 * @param MarkdownStringInstance The `vscode.MarkdownString` instance to convert.
 * @returns The `IMarkdownString` DTO.
 */
export function FromAPI(
	MarkdownStringInstance: MarkdownString,
): IMarkdownString {
	return {
		value: MarkdownStringInstance.value,
		isTrusted: MarkdownStringInstance.isTrusted,
		// Note: The `uris` property, used for managing related resources,
		// would need to be serialized here if supported.
	};
}

/**
 * Revives a markdown string DTO back into a `vscode.MarkdownString` class instance.
 * @param MarkdownStringDTO The `IMarkdownString` DTO to revive.
 * @returns A new `vscode.MarkdownString` instance.
 */
export function ToAPI(MarkdownStringDTO: IMarkdownString): MarkdownString {
	const result = new MarkdownString(
		MarkdownStringDTO.value,
		MarkdownStringDTO.isTrusted,
	);
	// Note: The `uris` property would be revived here if supported.
	return result;
}
