// File: Cocoon/Source/Service/StoragePath/Live.ts

import { Layer } from "effect";

import { Live as FileSystemLive } from "../FileSystem.js";
import { type IPCConfiguration } from "../IPC/Configuration.js";
import { Live as LogLive } from "../Log.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the StoragePath service.
 * It depends on the FileSystem, Log, and InitData services.
 * @param Config The IPC configuration.
 */
const Live = (Config: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(
		// Provide its dependencies. It now also depends on InitDataService.
		Layer.provide(
			Layer.mergeAll(
				FileSystemLive(Config),
				LogLive,
				// We don't provide InitDataLive here, we declare it as a requirement
			),
		),
	);

export default Live;
