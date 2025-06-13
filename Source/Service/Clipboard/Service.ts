/**
 * @module Service (Clipboard)
 * @description Defines the interface and Context.Tag for the Clipboard service.
 * This service implements the `vscode.env.clipboard` API.
 */

import { Context } from "effect";
import type { Clipboard } from "vscode";

/**
 * The service interface for the `vscode.env.clipboard` API.
 * The methods return Promises to be compatible with the vscode API definition.
 */
export type Interface = Clipboard;

/**
 * The Context.Tag for the Clipboard service.
 */
export const Tag = Context.Tag<Interface>("Service/Clipboard");
