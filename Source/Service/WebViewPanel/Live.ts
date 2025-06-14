/**
 * @module Live (WebViewPanel)
 * @description The live implementation Layer for the WebViewPanel service.
 */

import { Layer } from "effect";

import type IPCConfiguration from "../IPC/Configuration.js";
import IPCLive from "../IPC/Live.js";
import LogLive from "../Log/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the WebViewPanel service.
 * It depends on the IPC service for communication and Log for diagnostics.
 * This is a factory that takes IPC configuration.
 * @param Config The IPC configuration.
 */
export default function (Config: {
	MountainAddress: string;
	CocoonAddress: string;
}) {
	return Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), LogLive)),
	);
}
