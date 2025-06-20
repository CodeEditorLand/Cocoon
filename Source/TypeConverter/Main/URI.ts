

/**
 * @module URI (Main/TypeConverter)
 * @description Converts between `vscode.URI` and its DTO representation.
 */

import type { UriComponents } from "vs/base/common/uri.js";
import type { Uri as VSCodeURIType } from "vscode";

import { URI as VSCodeURI } from "../../Type/ExtHostTypes.js";

/**
 * Converts a `vscode.URI` object into a plain JSON object for IPC.
 * This uses the canonical `.toJSON()` method.
 * @param URI The `vscode.URI` instance to convert.
 * @returns The `UriComponents` DTO.
 */
const FromAPI = (URI: VSCodeURIType): UriComponents => URI.toJSON();

/**
 * Revives a URI DTO back into a `vscode.URI` class instance.
 * This uses the canonical `URI.revive()` static method.
 * @param DTO The `UriComponents` DTO to revive.
 * @returns A new `vscode.URI` instance.
 */
const ToAPI = (DTO: UriComponents): VSCodeURIType => VSCodeURI.revive(DTO);

export default { FromAPI, ToAPI };
