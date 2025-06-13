/**
 * @module Storage
 * @description This module provides the `vscode.Memento` API for persistent
 * key-value storage, proxying all operations to the Mountain host.
 */

import { Layer } from "effect";

import { Live as LiveIPC } from "./IPC.js";
import { Live as LiveLog } from "./Log.js";
import { Definition } from "./Storage/Definition.js";
import { Tag } from "./Storage/Service.js";

export { Tag, type Interface } from "./Storage/Service.js";
export type { Memento } from "vscode";

/**
 * The live implementation Layer for the Storage service.
 * It depends on the IPC and Log services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIPC, LiveLog)),
);
