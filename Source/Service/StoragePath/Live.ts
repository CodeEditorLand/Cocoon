/**
 * @module Live (StoragePath)
 * @description The live implementation Layer for the StoragePath service.
 */

import { Layer } from "effect";

import { Live as FileSystemLive } from "../FileSystem.js";
import type IPCConfigurationService from "../IPC/Configuration.js";
import { Live as LogLive } from "../Log.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the StoragePath service.
 * It depends on the FileSystem, Log, and InitData services.
 * @param Config The IPC configuration.
 */
const Live = (Config: IPCConfigurationService) =>
	Layer.effect(Service, Definition).pipe(
		// The FileSystem dependency is for the EnsureDirectory helper.
		Layer.provide(Layer.merge(FileSystemLive(Config), LogLive)),
	);

export default Live;
