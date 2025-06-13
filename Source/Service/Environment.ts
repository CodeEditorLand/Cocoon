/**
 * @module Env
 * @description This module provides the `vscode.env` API implementation, offering
 * information about the application environment and core utilities.
 */

import { Layer } from "effect";

import { Live as LiveClipboard } from "../Clipboard.js";
import { InitDataService } from "../InitData.js";
import { Live as LiveIPC } from "../IPC.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";

/**
 * The live implementation Layer for the Env service.
 * It depends on the InitData, IPC, and Clipboard services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIPC, LiveClipboard)),
	// The InitDataService must be provided by the top-level application layer.
);
