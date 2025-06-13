/**
 * @module Clipboard
 * @description This module provides the `vscode.env.clipboard` API implementation,
 * proxying all clipboard operations to the Mountain host.
 */

import { Layer } from "effect";

import { Live as LiveIpc } from "../Ipc/mod.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";

/**
 * The live implementation Layer for the Clipboard service.
 * It depends on the Ipc service for communication.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIpc));
