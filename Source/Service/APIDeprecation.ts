/**
 * @module APIDeprecation
 * @description This module provides the APIDeprecation service, which is used to
 * report and handle the usage of deprecated APIs by extensions.
 */

import { Layer } from "effect";

import { Definition } from "./APIDeprecation/Definition.js";
import { Tag, type Interface } from "./APIDeprecation/Service.js";
import { Live as LiveLog } from "./Log.js";

export { Tag, type Interface };

/**
 * The live implementation Layer for the APIDeprecation service.
 * It depends on the Log service to output warnings.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveLog));
