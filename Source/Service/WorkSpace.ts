/**
 * @module WorkSpace
 * @description This module provides the `vscode.workspace` API implementation,
 * orchestrating other services like Document, FileSystem, and Configuration.
 */

import { Layer } from "effect";

import { Live as LiveConfiguration } from "./Configuration.js";
import { Live as LiveDocument } from "./Document.js";
import { Live as LiveFileSystem } from "./FileSystem.js";
import { Live as LiveIPC } from "./IPC.js";
import { Definition } from "./WorkSpace/Definition.js";
import { Tag } from "./WorkSpace/Service.js";

export { Tag, type Interface } from "./WorkSpace/Service.js";
export type { WorkspaceFolder } from "vscode";

/**
 * The live implementation Layer for the WorkSpace service.
 * It depends on the IPC, Document, FileSystem, and Configuration services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(
		Layer.mergeAll(
			LiveIPC,
			LiveDocument,
			LiveFileSystem,
			LiveConfiguration,
		),
	),
);
