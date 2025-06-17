/*
 * File: Cocoon/Source/Core/APIFactory/Live.ts
 * Responsibility:
 * Modified: 2025-06-16 14:59:29 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (APIFactory)
 * @description The live implementation `Layer` for the `APIFactory` service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation `Layer` for the `APIFactory` service.
 * It provides all the necessary service layers required by the `Definition`.
 */
export default Layer.effect(Service, Definition);
