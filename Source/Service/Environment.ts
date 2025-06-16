/*
 * File: Cocoon/Source/Service/Environment.ts
 * Responsibility:
 * Modified: 2025-06-15 19:17:07 UTC
 * Dependency: ./Clipboard.js, ./Environment/Definition.js, ./Environment/Service.js, ./IPC.js, ./IPC/Configuration.js, effect
 * Export: Live, default
 */

/**
 * @module Environment
 * @description This module provides the `vscode.env` API implementation,
 * exposing information about the application and host environment.
 */

import { Layer } from "effect";

import { Live as ClipboardLive } from "./Clipboard.js";
import Definition from "./Environment/Definition.js";
import Service from "./Environment/Service.js";
import { Live as IPCLive } from "./IPC.js";
import type { IPCConfiguration } from "./IPC/Configuration.js";

export { default as Service } from "./Environment/Service.js";

/**
 * The live implementation Layer for the Environment service.
 * It depends on IPC and Clipboard services.
 * This is a factory that takes IPC configuration.
 * @param Configuration The IPC configuration.
 */
export const Live = (Configuration: IPCConfiguration) => {
	// Create instances of the dependency layers by calling their factory functions.
	const IpcLayer = IPCLive(Configuration);
	const ClipboardLayer = ClipboardLive(Configuration);

	// The Definition for the Environment service requires IPC and Clipboard services.
	// We provide them here.
	return Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IpcLayer, ClipboardLayer)),
	);
};
