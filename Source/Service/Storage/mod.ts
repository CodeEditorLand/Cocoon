/**
 * @module Storage
 * @description This module provides the `vscode.Memento` API for persistent
 * key-value storage, proxying all operations to the Mountain host.
 */

import { Layer } from "effect";

import { Live as LiveIpc } from "../Ipc/mod.js";
import { Live as LiveLog } from "../Log.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export type { Memento } from "vscode";

/**
 * The live implementation Layer for the Storage service.
 * It depends on the Ipc and Log services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIpc, LiveLog)),
);
