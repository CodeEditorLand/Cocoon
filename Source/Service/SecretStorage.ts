/**
 * @module SecretStorage
 * @description This module provides the `vscode.SecretStorage` API for securely
 * storing sensitive data by proxying to the OS keychain via Mountain.
 */

import { Layer } from "effect";

import { Live as LiveIpc } from "../Ipc.js";
import { Live as LiveLog } from "../Log.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export type { SecretStorage } from "vscode";

/**
 * The live implementation Layer for the SecretStorage service.
 * It depends on the Ipc and Log services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIpc, LiveLog)),
);
