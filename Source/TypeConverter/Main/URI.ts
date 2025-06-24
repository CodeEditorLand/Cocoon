/**
 * @module URI
 * @description Converts between `vscode.URI` and its DTO representation, `UriComponents`.
 */

import type { UriComponents } from "vs/base/common/uri.js";
import type { Uri as VSCodeURI } from "vscode";
import { URI } from "../../Platform/VSCode/Type.js";

/**
 * @description Converts a `vscode.URI` object into a plain JSON object for IPC.
 * This uses the canonical `.toJSON()` method.
 * @param URI The `vscode.URI` instance to convert.
 * @returns The `UriComponents` DTO.
 */
export const FromAPI = (URI: VSCodeURI): UriComponents =>
	URI.toJSON();

/**
 * @description Revives a URI DTO back into a `vscode.URI` class instance.
 * This uses the canonical `URI.revive()` static method.
 * @param DTO The `UriComponents` DTO to revive.
 * @returns A new `vscode.URI` instance.
 */
export const ToAPI = (DTO: UriComponents): VSCodeURI => URI.revive(DTO);
