/*
 * File: Cocoon/Source/Service/Cancellation/Live.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:45 UTC
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
