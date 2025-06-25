/**
 * @module URI
 * @description Converts between `vscode.URI` and its DTO representation, `UriComponents`.
 * This file has been created to resolve an import cycle.
 */
import type { UriComponents } from "vs/base/common/uri.js";
import type { Uri as VSCodeURI } from "vscode";
/**
 * @description Converts a `vscode.URI` object into a plain JSON object for IPC.
 * @param URI The `vscode.URI` instance to convert.
 * @returns The `UriComponents` DTO.
 */
export declare const FromAPI: (TheURI: VSCodeURI) => UriComponents;
/**
 * @description Revives a URI DTO back into a `vscode.URI` class instance.
 * @param DTO The `UriComponents` DTO to revive.
 * @returns A new `vscode.URI` instance.
 */
export declare const ToAPI: (DTO: UriComponents) => VSCodeURI;
