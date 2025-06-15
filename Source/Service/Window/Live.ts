/**
 * @module Live (Window)
 * @description The live implementation Layer for the Window service.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "../IPC.js";
import type IPCConfigurationService from "../IPC/Configuration.js";
import { Live as WorkSpaceLive } from "../WorkSpace.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Window service.
 * @param Config The IPC Configuration.
 */
export default function (Config: IPCConfigurationService) {
	return Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), WorkSpaceLive(Config))),
	);
}
