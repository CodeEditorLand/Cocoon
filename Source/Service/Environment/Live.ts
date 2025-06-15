/**
 * @module Live (Environment)
 * @description The live implementation Layer for the Environment service.
 */

import { Layer } from "effect";

import { Live as ClipboardLive } from "../Clipboard.js";
import { Live as IPCLive } from "../IPC.js";
import type IPCConfigurationService from "../IPC/Configuration.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Environment service.
 * It depends on IPC and Clipboard services.
 * This is a factory that takes IPC configuration.
 * @param Config The IPC configuration.
 */
const Live = (Config: IPCConfigurationService) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), ClipboardLive(Config))),
	);

export default Live;
