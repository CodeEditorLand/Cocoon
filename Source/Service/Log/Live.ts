/*
 * File: Cocoon/Source/Service/Log/Live.ts
 * Responsibility:
 * Modified: 2025-06-15 19:16:56 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Log)
 * @description The live implementation `Layer` for the Log service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Log service.
 * It has no external dependencies.
 */
const Live = Layer.effect(Service, Definition);

export default Live;
