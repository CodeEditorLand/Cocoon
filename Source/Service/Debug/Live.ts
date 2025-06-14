/**
 * @module Live (Debug)
 * @description This module provides the `Live` implementation Layer for the Debug service.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "../IPC.js";
import type IPCConfiguration from "../IPC/Configuration.js";
import LogLive from "../Log/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Debug service.
 * It depends on the IPC and Log services.
 * This is a factory that takes IPC configuration.
 * @param Config The IPC configuration.
 */
const Live = (Config: IPCConfiguration) => {
	return Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), LogLive)),
	);
};

export default Live;
