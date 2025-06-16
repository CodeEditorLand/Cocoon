/*
 * File: Cocoon/Source/Service/APIDeprecation/Live.ts
 * Responsibility:
 * Modified: 2025-06-15 19:17:16 UTC
 * Dependency: ../Log.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (APIDeprecation)
 * @description The live implementation `Layer` for the APIDeprecation service.
 */

import { Layer } from "effect";

import { Live as LogLive } from "../Log.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the APIDeprecation service.
 * It depends on the Log service to output warnings.
 */
const Live = Layer.effect(Service, Definition).pipe(Layer.provide(LogLive));

export default Live;
