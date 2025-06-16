/*
 * File: Cocoon/Source/Service/Message/Live.ts
 * Responsibility:
 * Modified: 2025-06-16 14:45:21 UTC
 * Dependency: ../IPC.js, ../IPC/Configuration.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Message)
 * @description The live implementation Layer for the Message service.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "../IPC.js";
import { type IPCConfiguration } from "../IPC/Configuration.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Message service.
 * It depends on the IPC service for communication.
 * This is a factory that takes IPC configuration.
 * @param Config The IPC configuration.
 */
const Live = (Config: IPCConfiguration) => {
	return Layer.effect(Service, Definition).pipe(
		Layer.provide(IPCLive(Config)),
	);
};

export default Live;
