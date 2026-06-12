/**
 * @module MarkdownString
 * @description Converts between `vscode.MarkdownString` and its DTO representation.
 */

import type {
	IMarkdownString,
	MarkdownStringTrustedOptions,
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/htmlContent.js";

import type { URI } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js";

import type { Uri, MarkdownString as VSCodeMarkdownString } from "vscode";

import { MarkdownString } from "../../../Platform/VSCode/Type.js";

/**
 * @description Converts a `vscode.MarkdownString` object into a plain DTO for IPC.
 * @param MarkdownStringInstance The `vscode.MarkdownString` instance to convert.
 * @returns The `IMarkdownString` DTO.
 */
export const FromAPI = (
	MarkdownStringInstance: VSCodeMarkdownString,
): IMarkdownString => ({
	value: MarkdownStringInstance.value,
	// FIX: Handle exactOptionalPropertyTypes
	...(MarkdownStringInstance.isTrusted && {
		isTrusted: MarkdownStringInstance.isTrusted,
	}),
	...(MarkdownStringInstance.baseUri && {
		baseUri: MarkdownStringInstance.baseUri as unknown as URI,
	}),
	...(MarkdownStringInstance.supportHtml && {
		supportHtml: MarkdownStringInstance.supportHtml,
	}),
};

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
	;

	// FIX: Handle optional properties correctly
	if (MarkdownStringDTO.baseUri) {
		result.baseUri = MarkdownStringDTO.baseUri as unknown as Uri;
	}

	if (MarkdownStringDTO.supportHtml) {
		result.supportHtml = MarkdownStringDTO.supportHtml;
	}

	return result;
};
