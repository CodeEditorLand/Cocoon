/**
 * @module WorkSpace
 * @description This module provides the `vscode.workspace` API implementation,
 * orchestrating other services like Documents, FileSystem, and Configuration.
 */

import { Layer } from "effect";

import { Live as LiveConfiguration } from "../Configuration.js";
import { Live as LiveDocuments } from "../Documents.js";
import { Live as LiveFileSystem } from "../FileSystem.js";
import { Live as LiveIPC } from "../IPC.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export type { WorkSpaceFolder } from "vscode";

/**
 * The live implementation Layer for the WorkSpace service.
 * It depends on the IPC, Documents, FileSystem, and Configuration services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(
		Layer.mergeAll(
			LiveIPC,
			LiveDocuments,
			LiveFileSystem,
			LiveConfiguration,
		),
	),
);
