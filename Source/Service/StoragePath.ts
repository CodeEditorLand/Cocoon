/**
 * @module StoragePath
 * @description This module provides the StoragePath service, which resolves
 * filesystem URIs for extension-specific storage.
 */

import { Layer } from "effect";

import { Live as LiveFileSystem } from "./FileSystem.js";
import { Live as LiveLog } from "./Log.js";
import { Definition } from "./StoragePath/Definition.js";
import { Tag } from "./StoragePath/Service.js";

export { Tag, type Interface } from "./StoragePath/Service.js";

/**
 * The live implementation Layer for the StoragePath service.
 * It depends on the FileSystem, Log, and InitData services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	// The FileSystem dependency is for the EnsureDirectory helper.
	Layer.provide(Layer.merge(LiveFileSystem, LiveLog)),
);
