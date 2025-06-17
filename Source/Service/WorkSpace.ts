/*
 * File: Cocoon/Source/Service/WorkSpace.ts
 * Responsibility:
 * Modified: 2025-06-16 14:46:10 UTC
 * Dependency: ./Configuration.js, ./Document.js, ./FileSystem.js, ./IPC.js, ./IPC/Configuration.js, ./WorkSpace/Definition.js, ./WorkSpace/Service.js, effect, vscode
 * Export: Live, default
 */

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
import { type IPCConfiguration } from "./IPC/Configuration.js";
import Definition from "./WorkSpace/Definition.js";
import Service from "./WorkSpace/Service.js";

export { default as Service } from "./WorkSpace/Service.js";
export type { WorkspaceFolder };

/**
 * The live implementation Layer for the WorkSpace service.
 * @param Configuration The IPC Configuration.
 */
export default (Configuration: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(
			Layer.mergeAll(
				IPCLive(Configuration),
				DocumentLive(Configuration),
				FileSystemLive(Configuration),
				ConfigurationLive(Configuration),
			),
		),
	);
