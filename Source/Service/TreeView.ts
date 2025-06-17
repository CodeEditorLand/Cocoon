/*
 * File: Cocoon/Source/Service/TreeView.ts
 * Responsibility:
 * Modified: 2025-06-16 14:46:10 UTC
 * Dependency: ./Command.js, ./IPC.js, ./IPC/Configuration.js, ./TreeView/Definition.js, ./TreeView/Service.js, effect
 * Export: Live, default
 */

/**
 * @module TreeView
 * @description This module provides the `vscode.window.createTreeView` API, allowing
 * extensions to contribute custom tree views to the sidebar.
 */

import { Layer } from "effect";

import { Live as CommandLive } from "./Command.js";
import { Live as IPCLive } from "./IPC.js";
import { type IPCConfiguration } from "./IPC/Configuration.js";
import Definition from "./TreeView/Definition.js";
import Service from "./TreeView/Service.js";

export { default as Service } from "./TreeView/Service.js";

/**
 * The live implementation Layer for the TreeView service.
 * It depends on the IPC and Command services.
 * @param Configuration The IPC configuration.
 */
export default (Configuration: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(
			Layer.merge(IPCLive(Configuration), CommandLive(Configuration)),
		),
	);
