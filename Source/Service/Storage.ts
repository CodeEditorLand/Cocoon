/**
 * @module Storage
 * @description This module provides the `vscode.Memento` API for persistent
 * key-value storage, proxying all operations to the Mountain host.
 */

import { Layer } from "effect";
import type { Memento } from "vscode";

import {
	Live as LiveIPC,
	type Configuration as IPCConfiguration,
} from "./IPC.js";
import { Live as LiveLog } from "./Log.js";
import { Definition } from "./Storage/Definition.js";
import { Tag } from "./Storage/Service.js";

export { Tag, type Interface } from "./Storage/Service.js";
export type { Memento };

/**
 * The live implementation Layer for the Storage service.
 * @param Config The IPC configuration.
 */
export const Live = (Config: IPCConfiguration) =>
	Layer.effect(Tag, Definition).pipe(
		Layer.provide(Layer.merge(LiveIPC(Config), LiveLog)),
	);
