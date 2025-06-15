/**
 * @module Live (Localization)
 * @description The live implementation Layer for the Localization service.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "../IPC.js";
import type IPCConfigurationService from "../IPC/Configuration.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Localization service.
 * It depends on the IPC and InitData services.
 * This is a factory that takes IPC configuration.
 * @param Config The IPC configuration.
 */
export default function (Config: IPCConfigurationService) {
	return Layer.effect(Service, Definition).pipe(
		Layer.provide(IPCLive(Config)),
	);
}
