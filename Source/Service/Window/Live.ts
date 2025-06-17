/*
 * File: Cocoon/Source/Service/Window/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:09 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Window)
 * @description The live implementation Layer for the Window service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Window service.
 */
export default Layer.effect(Service, Definition);
