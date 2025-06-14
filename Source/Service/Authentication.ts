/**
 * @module Authentication
 * @description This module provides the `vscode.authentication` API, allowing extensions
 * to request authentication sessions and for Cocoon to register its own auth providers.
 */

import { Layer } from "effect";

import { Definition } from "./Authentication/Definition.js";
import { Tag } from "./Authentication/Service.js";
import { Live as LiveIPC, type Configuration } from "./IPC.js";

export { Tag, type Interface } from "./Authentication/Service.js";
export * from "./Authentication/Type.js";
export * from "./Authentication/Error.js";

/**
 * The live implementation Layer for the Authentication service.
 * It depends on the IPC service for all communication.
 * This is a factory that takes IPC configuration.
 * @param Config The IPC configuration.
 */
export const Live = (Config: Configuration) =>
	Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC(Config)));
