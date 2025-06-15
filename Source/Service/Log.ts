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
export const Live = Layer.effect(Service, Definition);
