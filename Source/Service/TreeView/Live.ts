/**
 * @module Live (TreeView)
 * @description This module provides the `Live` implementation Layer for the TreeView service.
 */

import { Layer } from "effect";

import { Live as CommandLive } from "../Command.js";
import { Live as IPCLive } from "../IPC.js";
import type IPCConfigurationService from "../IPC/Configuration.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the TreeView service.
 * It depends on the IPC and Command services.
 * @param Config The IPC configuration.
 */
const Live = (Config: IPCConfigurationService) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), CommandLive(Config))),
	);

export default Live;
