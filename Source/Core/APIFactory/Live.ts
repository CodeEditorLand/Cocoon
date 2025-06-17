/*
 * File: Cocoon/Source/Core/APIFactory/Live.ts
 * Responsibility: Implements the live Layer for the APIFactory service in the Cocoon sidecar, providing dependency injection for VS Code extension APIs using Effect's Layer to combine service definitions and implementations.
 * Modified: 2025-06-17 21:19:42 UTC
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
