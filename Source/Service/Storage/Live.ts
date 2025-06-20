

/**
 * @module Live (Storage)
 * @description The live implementation Layer for the Storage service.
 */

import { Effect, Layer } from "effect";

import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Storage service.
 * It depends on IPC and Log services.
 */
const Live: Layer.Layer<Service, never, IPCService | LogService> = Layer.effect(
	Service,
	// The Definition effect uses IPC.SendRequest, which can fail.
	// We treat this as a fatal error for layer construction using orDie.
	// This ensures the Layer's error channel is `never`.
	Definition.pipe(Effect.orDie),
);

export default Live;
