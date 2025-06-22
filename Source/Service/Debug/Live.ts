/*
 * File: Cocoon/Source/Service/Debug/Live.ts
 *
 * This file provides the `Live` implementation Layer for the Debug service.
 */

import { Layer } from "effect";

import IPCService from "../IPC/Service.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Debug service.
 * It depends on the IPC service.
 */
const Live: Layer.Layer<Service, never, IPCService> = Layer.effect(
	Service,
	Definition,
);

export default Live;
