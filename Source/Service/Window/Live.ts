/*
 * File: Cocoon/Source/Service/Window/Live.ts
 * Responsibility:
 * Modified: 2025-06-16 14:45:21 UTC
 * Dependency: ../IPC.js, ../IPC/Configuration.js, ../WorkSpace.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Window)
 * @description The live implementation Layer for the Window service.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "../IPC.js";
import { type IPCConfiguration } from "../IPC/Configuration.js";
import { Live as WorkSpaceLive } from "../WorkSpace.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Window service.
 * @param Configuration The IPC Configuration.
 */
export default function (Configuration: IPCConfiguration) {
	return Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Configuration), WorkSpaceLive(Configuration))),
	);
}
