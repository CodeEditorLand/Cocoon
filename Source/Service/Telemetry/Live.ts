/*
 * File: Cocoon/Source/Service/Telemetry/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:11 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Telemetry)
 * @description The live implementation Layer for the Telemetry service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Telemetry service.
 */
export default Layer.effect(Service, Definition);
