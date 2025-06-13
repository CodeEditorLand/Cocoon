/**
 * @module FileSystem
 * @description This module provides the `vscode.workspace.fs` API implementation,
 * proxying all filesystem operations to the Mountain host.
 */

import { Layer } from "effect";

import { Live as LiveFileSystemInfo } from "../FileSystemInfo.js";
import { Live as LiveIpc } from "../Ipc.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export * from "./Error.js";

/**
 * The live implementation Layer for the FileSystem service.
 * It depends on the Ipc and FileSystemInfo services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIpc, LiveFileSystemInfo)),
);
