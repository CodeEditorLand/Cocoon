/**
 * @module Live (Dialog)
 * @description The live implementation Layer for the Dialog service.
 */

import { Layer } from "effect";

import type IPCConfiguration from "../IPC/Configuration.js";
import IPCLive from "../IPC/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Dialog service.
 * It depends on the IPC service for all communication.
 * This is a factory that takes IPC configuration.
 * @param Config The IPC configuration.
 */
export default function (Config: {
	MountainAddress: string;
	CocoonAddress: string;
}) {
	return Layer.effect(Service, Definition).pipe(
		Layer.provide(IPCLive(Config)),
	);
}
