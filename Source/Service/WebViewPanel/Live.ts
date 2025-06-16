/*
 * File: Cocoon/Source/Service/WebViewPanel/Live.ts
 * Responsibility: 
 * Modified: 2025-06-16 14:45:21 UTC
 * Dependency: ../IPC.js, ../IPC/Configuration.js, ../Log.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (WebViewPanel)
 * @description The live implementation Layer for the WebViewPanel service.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "../IPC.js";
import { type IPCConfiguration } from "../IPC/Configuration.js";
import { Live as LogLive } from "../Log.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the WebViewPanel service.
 * It depends on the IPC service for communication and Log for diagnostics.
 * @param Config The IPC configuration.
 */
const Live = (Config: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), LogLive)),
	);

export default Live;
