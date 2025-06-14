/**
 * @module WorkSpace
 * @description This module provides the `vscode.workspace` API implementation,
 * orchestrating other services like Document, FileSystem, and Configuration.
 */

import { Layer } from "effect";
import type { WorkspaceFolder } from "vscode";

import { Live as LiveConfiguration } from "./Configuration.js";
import { Live as LiveDocument } from "./Document.js";
import { Live as LiveFileSystem } from "./FileSystem.js";
import {
	Live as LiveIPC,
	type Configuration as IPCConfiguration,
} from "./IPC.js";
import { Definition } from "./WorkSpace/Definition.js";
import { Tag, type Interface } from "./WorkSpace/Service.js";

export { Tag, type Interface, type WorkspaceFolder };

/**
 * The live implementation Layer for the WorkSpace service.
 * @param Config The IPC Configuration.
 */
export const Live = (Config: IPCConfiguration) =>
	Layer.effect(Tag, Definition).pipe(
		Layer.provide(
			Layer.mergeAll(
				LiveIPC(Config),
				LiveDocument(Config),
				LiveFileSystem(Config),
				LiveConfiguration(Config),
			),
		),
	);
