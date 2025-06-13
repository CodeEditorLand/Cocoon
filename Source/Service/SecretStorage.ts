/**
 * @module SecretStorage
 * @description This module provides the `vscode.SecretStorage` API for securely
 * storing sensitive data by proxying to the OS keychain via Mountain.
 */

import { Layer } from "effect";

import { Live as LiveIPC } from "./IPC.js";
import { Live as LiveLog } from "./Log.js";
import { Definition } from "./SecretStorage/Definition.js";
import { Tag } from "./SecretStorage/Service.js";

export { Tag, type Interface } from "./SecretStorage/Service.js";
export type { SecretStorage } from "vscode";

/**
 * The live implementation Layer for the SecretStorage service.
 * It depends on the IPC and Log services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIPC, LiveLog)),
);
