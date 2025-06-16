/*
 * File: Cocoon/Source/Service/Storage/Live.ts
 * Responsibility:
 * Modified: 2025-06-16 14:45:21 UTC
 * Dependency: ../IPC.js, ../IPC/Configuration.js, ../Log.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Storage)
 * @description The live implementation Layer for the Storage service.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "../IPC.js";
import { type IPCConfiguration } from "../IPC/Configuration.js";
import { Live as LogLive } from "../Log.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Storage service.
 * @param Config The IPC configuration.
 */
const Live = (Config: IPCConfiguration) => {
	return Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), LogLive)),
	);
};

export default Live;
