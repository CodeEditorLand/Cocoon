/**
 * @module Service (FileSystem)
 * @description Defines the interface and Context.Tag for the FileSystem service.
 */

import { Context } from "effect";
import type { FileSystem } from "vscode";

/**
 * The service interface for the `vscode.workspace.fs` API.
 * The methods return Promises to conform to the vscode API definition.
 */
export type Interface = FileSystem;

export const Tag = Context.Tag<Interface>("Service/FileSystem");
