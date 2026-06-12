/**
 * @module URI
 * @description Converts between `vscode.URI` and its DTO representation, `UriComponents`.
 * This file has been created to resolve an import cycle.
 */

import type { UriComponents } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js";
import type { Uri as VSCodeURI } from "vscode";

import { URI } from "../../Platform/VSCode/Type.js";

/**
 * @description Converts a `vscode.URI` object into a plain JSON object for IPC.
 * @param URI The `vscode.URI` instance to convert.
 * @returns The `UriComponents` DTO.
 */
export const FromAPI = (TheURI: VSCodeURI): UriComponents => TheURI.toJSON(;

/**
 * @description Revives a URI DTO back into a `vscode.URI` class instance.
 * @param DTO The `UriComponents` DTO to revive.
 * @returns A new `vscode.URI` instance.
 */
export const ToAPI = (DTO: UriComponents): VSCodeURI => URI.revive(DTO;
