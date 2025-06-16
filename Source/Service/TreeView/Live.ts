/*
 * File: Cocoon/Source/Service/TreeView/Live.ts
 * Responsibility: 
 * Modified: 2025-06-16 14:45:21 UTC
 * Dependency: ../Command.js, ../IPC.js, ../IPC/Configuration.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (TreeView)
 * @description This module provides the `Live` implementation Layer for the TreeView service.
 */

import { Layer } from "effect";

import { Live as CommandLive } from "../Command.js";
import { Live as IPCLive } from "../IPC.js";
import { type IPCConfiguration } from "../IPC/Configuration.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the TreeView service.
 * It depends on the IPC and Command services.
 * @param Config The IPC configuration.
 */
const Live = (Config: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), CommandLive(Config))),
	);

export default Live;
