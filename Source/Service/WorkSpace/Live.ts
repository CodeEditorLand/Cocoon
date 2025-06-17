/*
 * File: Cocoon/Source/Service/WorkSpace/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:08 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (WorkSpace)
 * @description The live implementation Layer for the WorkSpace service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the WorkSpace service.
 */
export default Layer.effect(Service, Definition);
