/**
 * @module Live (FileSystemInformation)
 * @description The live implementation Layer for the FileSystemInformation service.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "../IPC.js";
import type IPCConfigurationService from "../IPC/Configuration.js";
import { Live as LogLive } from "../Log.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the FileSystemInformation service.
 * It depends on the IPC and Log services.
 * @param Config The IPC configuration.
 */
const Live = (Config: IPCConfigurationService) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), LogLive)),
	);

export default Live;
