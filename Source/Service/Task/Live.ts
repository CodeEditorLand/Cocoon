/**
 * @module Live (Task)
 * @description The live implementation Layer for the Tasks service.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "../IPC.js";
import type IPCConfigurationService from "../IPC/Configuration.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Tasks service.
 * It depends on the IPC service for communication.
 * @param Config The IPC configuration.
 */
const Live = (Config: IPCConfigurationService) =>
	Layer.effect(Service, Definition).pipe(Layer.provide(IPCLive(Config)));

export default Live;
