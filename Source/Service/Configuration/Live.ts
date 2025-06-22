/*
 * File: Cocoon/Source/Service/Configuration/Live.ts
 *
 * This file provides the live implementation Layer for the Configuration service.
 */

import { Layer } from "effect";

import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Configuration service.
 * It depends on the IPC and Log services.
 */
const Live: Layer.Layer<Service, never, IPCService | LogService> = Layer.effect(
	Service,
	Definition,
);

export default Live;
