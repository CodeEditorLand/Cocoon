/**
 * @module WorkSpace
 * @description This module provides the `vscode.workspace` API implementation,
 * orchestrating other services like Document, FileSystem, and Configuration.
 */

import { Layer } from "effect";
import type { WorkspaceFolder } from "vscode";

import ConfigurationLive from "./Configuration/Live.js";
import DocumentLive from "./Document/Live.js";
import FileSystemLive from "./FileSystem/Live.js";
import type IPCConfiguration from "./IPC/Configuration.js";
import IPCLive from "./IPC/Live.js";
import Definition from "./WorkSpace/Definition.js";
import Service from "./WorkSpace/Service.js";

export { default as Service } from "./WorkSpace/Service.js";
export type { WorkspaceFolder };

/**
 * The live implementation Layer for the WorkSpace service.
 * @param Config The IPC Configuration.
 */
export const Live = (Config: IPCConfiguration) =>
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
