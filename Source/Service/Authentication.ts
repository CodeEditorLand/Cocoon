/**
 * @module Authentication
 * @description This module provides the `vscode.authentication` API, allowing extensions
 * to request authentication sessions and for Cocoon to register its own auth providers.
 */

import { Layer } from "effect";

import { Live as LiveIpc } from "../Ipc/mod.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export * from "./Type.js";
export * from "./Error.js";

/**
 * The live implementation Layer for the Authentication service.
 * It depends on the Ipc service for all communication.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIpc));
