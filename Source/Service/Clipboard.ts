/**
 * @module Clipboard
 * @description This module provides the `vscode.env.clipboard` API implementation,
 * proxying all clipboard operations to the Mountain host.
 */

import { Layer } from "effect";

import { Definition } from "./Clipboard/Definition.js";
import { Tag, type Interface as Clipboard } from "./Clipboard/Service.js";
import { Live as LiveIPC, type Configuration } from "./IPC.js";

export { Tag, type Clipboard };

/**
 * The live implementation Layer for the Clipboard service.
 * It depends on the IPC service for communication.
 * This is a factory that takes IPC configuration.
 * @param Config The IPC configuration.
 */
export const Live = (Config: Configuration) =>
	Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC(Config)));
