/**
 * @module StoragePaths
 * @description This module provides the StoragePaths service, which resolves
 * filesystem URIs for extension-specific storage.
 */

import { Layer } from "effect";

import { Live as LiveFileSystem } from "../FileSystem/mod.js";
import { InitDataService } from "../InitData.js";
import { Live as LiveLog } from "../Log.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";

/**
 * The live implementation Layer for the StoragePaths service.
 * It depends on the FileSystem, Log, and InitData services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveFileSystem, LiveLog)),
);
