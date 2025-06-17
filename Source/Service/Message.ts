/*
 * File: Cocoon/Source/Service/Message.ts
 * Responsibility:
 * Modified: 2025-06-16 14:46:10 UTC
 * Dependency: ./IPC.js, ./IPC/Configuration.js, ./Message/Definition.js, ./Message/Service.js, effect
 * Export: Live, default
 */

/**
 * @module Message
 * @description This module provides the `vscode.window.show...Message` APIs,
 * proxying requests to the Mountain host to display notifications.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "./IPC.js";
import { type IPCConfiguration } from "./IPC/Configuration.js";
import Definition from "./Message/Definition.js";
import Service from "./Message/Service.js";

export { default as Service } from "./Message/Service.js";
export type { default as ExtensionSource } from "./Message/Type.js";

/**
 * The live implementation Layer for the Message service.
 * It depends on the IPC service for communication.
 */
export default (Configuration: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(IPCLive(Configuration)),
	);
