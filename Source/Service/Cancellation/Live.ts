/*
 * File: Cocoon/Source/Service/Cancellation/Live.ts
 * Responsibility:
 * Modified: 2025-06-15 19:17:15 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Cancellation)
 * @description The live implementation `Layer` for the CancellationTokenProvider service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the CancellationTokenProvider service.
 * This is a self-contained layer with no external dependencies.
 */
export default Layer.effect(Service, Definition);
