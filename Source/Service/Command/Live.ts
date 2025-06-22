/*
 * File: Cocoon/Source/Service/Command/Live.ts
 *
 * This file provides the live implementation Layer for the Command service, managing
 * command registration and execution.
 */

import { Layer } from "effect";

import IPCService from "../IPC/Service.js";
import TelemetryService from "../Telemetry/Service.js";
import WindowService from "../Window/Service.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Command service.
 * It depends on the IPC, Telemetry, and Window services.
 */
const Live: Layer.Layer<
	Service,
	never,
	IPCService | TelemetryService | WindowService
> = Layer.effect(Service, Definition);

export default Live;
