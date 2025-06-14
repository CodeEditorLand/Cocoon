/**
 * @module Live (Configuration)
 * @description The live implementation Layer for the Configuration service.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "../IPC.js";
import type IPCConfiguration from "../IPC/Configuration.js";
import LogLive from "../Log/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Configuration service.
 * It depends on the IPC and Log services.
 */
const Live = (Config: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), LogLive)),
	);

export default Live;
