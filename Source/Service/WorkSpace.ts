/**
 * @module Workspace
 * @description This module provides the `vscode.workspace` API implementation,
 * orchestrating other services like Documents, FileSystem, and Configuration.
 */

import { Layer } from "effect";

import { Live as LiveConfiguration } from "../Configuration.js";
import { Live as LiveDocuments } from "../Documents.js";
import { Live as LiveFileSystem } from "../FileSystem.js";
import { Live as LiveIpc } from "../Ipc.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export type { WorkspaceFolder } from "vscode";

/**
 * The live implementation Layer for the Workspace service.
 * It depends on the Ipc, Documents, FileSystem, and Configuration services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(
		Layer.mergeAll(
			LiveIpc,
			LiveDocuments,
			LiveFileSystem,
			LiveConfiguration,
		),
	),
);
