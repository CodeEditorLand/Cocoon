/*
 * File: Cocoon/Source/Service/Command/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:31 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Command
 * @description This module provides the `vscode.commands` API implementation,
 * managing command registration and execution.
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
