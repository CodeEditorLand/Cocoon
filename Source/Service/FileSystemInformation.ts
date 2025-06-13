/**
 * @module FileSystemInfo
 * @description This module provides the FileSystemInfo service, which manages
 * filesystem provider capabilities, especially path case-sensitivity.
 */

import { Layer } from "effect";

import { Live as LiveIPC } from "../IPC.js";
import { Live as LiveLog } from "../Log.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";

/**
 * The live implementation Layer for the FileSystemInfo service.
 * It depends on the IPC and Log services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIPC, LiveLog)),
);
