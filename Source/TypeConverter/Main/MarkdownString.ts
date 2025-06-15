/**
 * @module MarkdownString (Main/TypeConverter)
 * @description Converts between `vscode.MarkdownString` and its DTO representation.
 */

import type {
	IMarkdownString,
	MarkdownStringTrustedOptions,
} from "vs/base/common/htmlContent.js";
import type { MarkdownString as VscMarkdownString } from "vscode";

import { MarkdownString } from "../../Type/ExtHostTypes.js";

/**
 * Converts a `vscode.MarkdownString` object into a plain DTO for IPC.
 * @param MarkdownStringInstance The `vscode.MarkdownString` instance to convert.
 * @returns The `IMarkdownString` DTO.
 */
const FromAPI = (
	MarkdownStringInstance: VscMarkdownString,
): IMarkdownString => ({
	value: MarkdownStringInstance.value,
	isTrusted: MarkdownStringInstance.isTrusted,
});

/**
 * Revives a markdown string DTO back into a `vscode.MarkdownString` class instance.
 * @param MarkdownStringDTO The `IMarkdownString` DTO to revive.
 * @returns A new `vscode.MarkdownString` instance.
 */
const ToAPI = (MarkdownStringDTO: IMarkdownString): VscMarkdownString => {
	const result = new MarkdownString(
		MarkdownStringDTO.value,
		typeof MarkdownStringDTO.isTrusted === "boolean"
			? MarkdownStringDTO.isTrusted
			: (MarkdownStringDTO.isTrusted as MarkdownStringTrustedOptions)
					?.enabled,
	);
	result.baseUri = MarkdownStringDTO.baseUri;
	result.supportHtml = MarkdownStringDTO.supportHtml;
	return result;
};

export default { FromAPI, ToAPI };
