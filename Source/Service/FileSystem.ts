/**
 * @module FileSystem
 * @description This module provides the `vscode.workspace.fs` API implementation,
 * proxying all filesystem operations to the Mountain host.
 */

import { Layer } from "effect";

import { Definition } from "./FileSystem/Definition.js";
import { Tag } from "./FileSystem/Service.js";
import { Live as LiveFileSystemInformation } from "./FileSystemInformation.js";
import { Live as LiveIPC } from "./IPC.js";

export { Tag, type Interface } from "./FileSystem/Service.js";
export * from "./FileSystem/Error.js";

/**
 * The live implementation Layer for the FileSystem service.
 * It depends on the IPC and FileSystemInformation services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIPC, LiveFileSystemInformation)),
);
