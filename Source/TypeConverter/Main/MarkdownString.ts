/**
 * @module MarkdownString
 * @description Converts between `vscode.MarkdownString` and its DTO representation.
 */

import type {
	IMarkdownString,
	MarkdownStringTrustedOptions,
} from "vs/base/common/htmlContent.js";
import type { URI } from "vs/base/common/uri.js";
import type { MarkdownString as VSCodeMarkdownString } from "vscode";
import { MarkdownString } from "../../Platform/VSCode/Type.js";

/**
 * @description Converts a `vscode.MarkdownString` object into a plain DTO for IPC.
 * @param MarkdownStringInstance The `vscode.MarkdownString` instance to convert.
 * @returns The `IMarkdownString` DTO.
 */
export const FromAPI = (
	MarkdownStringInstance: VSCodeMarkdownString,
): IMarkdownString => ({
	value: MarkdownStringInstance.value,
	isTrusted: MarkdownStringInstance.isTrusted,
	baseUri: MarkdownStringInstance.baseUri as unknown as URI,
	supportHtml: MarkdownStringInstance.supportHtml,
});

/**
 * @description Revives a markdown string DTO back into a `vscode.MarkdownString` class instance.
 * @param MarkdownStringDTO The `IMarkdownString` DTO to revive.
 * @returns A new `vscode.MarkdownString` instance.
 */
export const ToAPI = (
	MarkdownStringDTO: IMarkdownString,
): VSCodeMarkdownString => {
	const result = new MarkdownString(
		MarkdownStringDTO.value,
		typeof MarkdownStringDTO.isTrusted === "boolean"
			? MarkdownStringDTO.isTrusted
			: !!(MarkdownStringDTO.isTrusted as MarkdownStringTrustedOptions),
	);
	result.baseUri =
		MarkdownStringDTO.baseUri as unknown as VSCodeMarkdownString["baseUri"];
	result.supportHtml = MarkdownStringDTO.supportHtml;
	return result;
};
