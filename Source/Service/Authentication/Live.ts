/*
 * File: Cocoon/Source/Service/Authentication/Live.ts
 * Responsibility: 
 * Modified: 2025-06-16 14:45:33 UTC
 * Dependency: ../IPC.js, ../IPC/Configuration.js, ../Log/Live.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Authentication)
 * @description The live implementation Layer for the Authentication service.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "../IPC.js";
import { type IPCConfiguration } from "../IPC/Configuration.js";
import LogLive from "../Log/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Authentication service.
 * It depends on the IPC service for communication.
 * This is a factory that takes IPC configuration.
 * @param Config The IPC configuration.
 */
const Live = (Config: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), LogLive)),
	);

export default Live;
