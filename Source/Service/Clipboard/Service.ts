/**
 * @module Service (Clipboard)
 * @description Defines the interface and Context.Tag for the Clipboard service.
 * This service implements the `vscode.env.clipboard` API.
 */

import { Context } from "effect";
import type { Clipboard } from "vscode";

/**
 * The Context.Tag for the Clipboard service.
 */
export default class extends Context.Tag("Service/Clipboard")<
	any,
	Clipboard
>() {}
