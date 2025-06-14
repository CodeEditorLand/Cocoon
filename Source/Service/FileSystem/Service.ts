/**
 * @module Service (FileSystem)
 * @description Defines the interface and Context.Tag for the FileSystem service,
 * which implements the `vscode.workspace.fs` API.
 */

import { Context } from "effect";
import type { FileSystem } from "vscode";

/**
 * The `Context.Tag` for the `vscode.workspace.fs` API service.
 */
export default class extends Context.Tag("Service/FileSystem")<
	any,
	FileSystem
>() {}
