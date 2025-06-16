/*
 * File: Cocoon/Source/Service/Localization/Live.ts
 * Responsibility:
 * Modified: 2025-06-16 14:45:21 UTC
 * Dependency: ../IPC.js, ../IPC/Configuration.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Localization)
 * @description The live implementation Layer for the Localization service.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "../IPC.js";
import { type IPCConfiguration } from "../IPC/Configuration.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Localization service.
 * It depends on the IPC and InitData services.
 * This is a factory that takes IPC configuration.
 * @param Config The IPC configuration.
 */
export default function (Config: IPCConfiguration) {
	return Layer.effect(Service, Definition).pipe(
		Layer.provide(IPCLive(Config)),
	);
}
