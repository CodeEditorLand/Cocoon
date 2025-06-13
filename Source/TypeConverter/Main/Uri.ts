/**
 * @module Uri (Main/TypeConverter)
 * @description Converts between `vscode.Uri` and its DTO representation.
 */

import type { UriComponents } from "vs/base/common/uri.js";

import { URI as VSCodeUri } from "../../Type/ExtHostTypes.js";

/**
 * Converts a `vscode.Uri` object into a plain JSON object for IPC.
 * This uses the canonical `.toJSON()` method.
 */
export const fromAPI = (uri: VSCodeUri): UriComponents => {
	return uri.toJSON();
};

/**
 * Revives a URI DTO back into a `vscode.Uri` class instance.
 * This uses the canonical `Uri.revive()` static method.
 */
export const toAPI = (dto: UriComponents): VSCodeUri => {
	return VSCodeUri.revive(dto);
};
