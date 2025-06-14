/**
 * @module Live (Diagnostic)
 * @description The live implementation Layer for the Diagnostics service.
 */

import { Layer } from "effect";

import type IPCConfiguration from "../IPC/Configuration.js";
import IPCLive from "../IPC/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Diagnostics service.
 * It depends on the IPC service for communication.
 * This is a factory that takes IPC configuration.
 * @param Config The IPC configuration.
 */
const Live = (Config: IPCConfiguration) => {
	return Layer.effect(Service, Definition).pipe(
		Layer.provide(IPCLive(Config)),
	);
};

export default Live;
