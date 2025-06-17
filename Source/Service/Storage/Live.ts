/*
 * File: Cocoon/Source/Service/Storage/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:13 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Storage)
 * @description The live implementation Layer for the Storage service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Storage service.
 */
export default Layer.effect(Service, Definition);
