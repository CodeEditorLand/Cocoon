

/**
 * @module Service (FileSystem)
 * @description Defines the interface and Context.Tag for the FileSystem service,
 * which implements the `vscode.workspace.fs` API.
 */

import { Context } from "effect";
import type { Event, FileChangeEvent, FileSystem } from "vscode";

/**
 * A service interface that combines the standard `vscode.FileSystem`
 * methods with the `onDidChangeFile` event.
 */
export interface FileSystemServiceType extends FileSystem {
	readonly onDidChangeFile: Event<readonly FileChangeEvent[]>;
}

/**
 * The `Context.Tag` for the `vscode.workspace.fs` API service.
 */
export default class FileSystemService extends Context.Tag(
	"Service/FileSystem",
)<FileSystemService, FileSystemServiceType>() {}
