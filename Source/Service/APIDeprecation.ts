/**
 * @module APIDeprecation
 * @description This module provides the APIDeprecation service, which is used to
 * report and handle the usage of deprecated APIs by extensions.
 */

import { Layer } from "effect";

import Definition from "./APIDeprecation/Definition.js";
import Service from "./APIDeprecation/Service.js";
import { Live as LogLive } from "./Log.js";

export { default as Service } from "./APIDeprecation/Service.js";

/**
 * The live implementation Layer for the APIDeprecation service.
 * It depends on the Log service to output warnings.
 */
export const APIDeprecationLive = Layer.effect(Service, Definition).pipe(
	Layer.provide(LogLive),
);
