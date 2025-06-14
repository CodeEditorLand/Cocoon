/**
 * @module Live (StatusBar)
 * @description The live implementation Layer for the StatusBar service.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "../IPC.js";
import type IPCConfiguration from "../IPC/Configuration.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the StatusBar service.
 * It depends on the IPC service for communication.
 * @param Config The IPC configuration.
 */
const Live = (Config: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(Layer.provide(IPCLive(Config)));

export default Live;
