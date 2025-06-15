/**
 * @module WorkSpace
 * @description This module provides the `vscode.workspace` API implementation,
 * orchestrating other services like Document, FileSystem, and Configuration.
 */

import { Layer } from "effect";
import type { WorkspaceFolder } from "vscode";

import { Live as ConfigurationLive } from "./Configuration.js";
import { Live as DocumentLive } from "./Document.js";
import { Live as FileSystemLive } from "./FileSystem.js";
import { Live as IPCLive } from "./IPC.js";
import type IPCConfigurationService from "./IPC/Configuration.js";
import Definition from "./WorkSpace/Definition.js";
import Service from "./WorkSpace/Service.js";

export { default as Service } from "./WorkSpace/Service.js";
export type { WorkspaceFolder };

/**
 * The live implementation Layer for the WorkSpace service.
 * @param Config The IPC Configuration.
 */
export const Live = (Config: IPCConfigurationService) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(
			Layer.mergeAll(
				IPCLive(Config),
				DocumentLive(Config),
				FileSystemLive(Config),
				ConfigurationLive(Config),
			),
		),
	);
