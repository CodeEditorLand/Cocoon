/*
 * File: Cocoon/Source/Service/Log.ts
 * Responsibility:
 * Modified: 2025-06-15 19:16:55 UTC
 * Dependency: ./Log/Definition.js, ./Log/Service.js, effect
 * Export: Live, default
 */

/**
 * @module Log
 * @description This module provides a simple, internal logging service.
 * It's a facade over the main `Effect` logger, allowing other services
 * to declare a dependency on logging in a consistent way.
 */

import { Layer } from "effect";

import Definition from "./Log/Definition.js";
import Service from "./Log/Service.js";

export { default as Service } from "./Log/Service.js";

/**
 * The live implementation Layer for the Log service.
 * It has no external dependencies.
 */
export default Layer.effect(Service, Definition);
