/**
 * @module Live (Telemetry)
 * @description The live implementation Layer for the Telemetry service.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "../IPC.js";
import type IPCConfiguration from "../IPC/Configuration.js";
import LogLive from "../Log/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Telemetry service.
 * @param Config The IPC configuration.
 */
const Live = (Config: IPCConfiguration) => {
	return Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), LogLive)),
	);
};

export default Live;
