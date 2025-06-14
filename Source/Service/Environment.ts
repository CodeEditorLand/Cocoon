/**
 * @module Environment
 * @description This module provides the `vscode.env` API implementation,
 * exposing information about the application and host environment.
 */

import { Layer } from "effect";

import ClipboardLive from "./Clipboard/Live.js";
import Definition from "./Environment/Definition.js";
import Service from "./Environment/Service.js";
import type IPCConfiguration from "./IPC/Configuration.js";
import IPCLive from "./IPC/Live.js";

export { default as Service } from "./Environment/Service.js";

/**
 * The live implementation Layer for the Environment service.
 * It depends on IPC and Clipboard services.
 * This is a factory that takes IPC configuration.
 * @param Config The IPC configuration.
 */
export const Live = (Config: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), ClipboardLive(Config))),
	);
