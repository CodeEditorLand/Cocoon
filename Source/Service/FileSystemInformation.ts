/**
 * @module FileSystemInformation
 * @description This module provides the FileSystemInformation service, which manages
 * filesystem provider capabilities, especially path case-sensitivity.
 */

import { Layer } from "effect";

import { Definition } from "./FileSystemInformation/Definition.js";
import { Tag } from "./FileSystemInformation/Service.js";
import { Live as LiveIPC } from "./IPC.js";
import { Live as LiveLog } from "./Log.js";

export { Tag, type Interface } from "./FileSystemInformation/Service.js";

/**
 * The live implementation Layer for the FileSystemInformation service.
 * It depends on the IPC and Log services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIPC, LiveLog)),
);
