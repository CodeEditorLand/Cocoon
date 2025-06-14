/**
 * @module Live (Configuration)
 * @description The live implementation Layer for the Configuration service.
 */

import { Layer } from "effect";

import IPCLive from "../IPC/Live.js";
import LogLive from "../Log/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Configuration service.
 * It depends on the IPC and Log services.
 */
export default Layer.effect(Service, Definition).pipe(
	Layer.provide(Layer.merge(IPCLive, LogLive)),
);
