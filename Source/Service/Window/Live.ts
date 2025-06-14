/**
 * @module Live (Window)
 * @description The live implementation Layer for the Window service.
 */

import { Layer } from "effect";

import type IPCConfiguration from "../IPC/Configuration.js";
import IPCLive from "../IPC/Live.js";
import WorkSpaceLive from "../WorkSpace/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Window service.
 * @param Config The IPC Configuration.
 */
export default function (Config: {
	MountainAddress: string;
	CocoonAddress: string;
}) {
	return Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), WorkSpaceLive(Config))),
	);
}
