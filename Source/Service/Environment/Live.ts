/*
 * File: Cocoon/Source/Service/Environment/Live.ts
 * Responsibility: 
 * Modified: 2025-06-16 14:45:21 UTC
 * Dependency: ../Clipboard.js, ../IPC.js, ../IPC/Configuration.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Environment)
 * @description The live implementation Layer for the Environment service.
 */

import { Layer } from "effect";

import { Live as ClipboardLive } from "../Clipboard.js";
import { Live as IPCLive } from "../IPC.js";
import { type IPCConfiguration } from "../IPC/Configuration.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Environment service.
 * It depends on IPC and Clipboard services.
 * This is a factory that takes IPC configuration.
 * @param Config The IPC configuration.
 */
const Live = (Config: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), ClipboardLive(Config))),
	);

export default Live;
