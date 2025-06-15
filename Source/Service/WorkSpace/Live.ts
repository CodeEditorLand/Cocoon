/**
 * @module Live (WorkSpace)
 * @description The live implementation Layer for the WorkSpace service.
 */

import { Layer } from "effect";

import { Live as ConfigurationLive } from "../Configuration.js";
import { Live as DocumentLive } from "../Document.js";
import { Live as FileSystemLive } from "../FileSystem.js";
import { Live as IPCLive } from "../IPC.js";
import type IPCConfigurationService from "../IPC/Configuration.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the WorkSpace service.
 * @param Config The IPC Configuration.
 */
export default function (Config: IPCConfigurationService) {
	return Layer.effect(Service, Definition).pipe(
		Layer.provide(
			Layer.mergeAll(
				IPCLive(Config),
				DocumentLive(Config),
				FileSystemLive(Config),
				ConfigurationLive(Config),
			),
		),
	);
}
