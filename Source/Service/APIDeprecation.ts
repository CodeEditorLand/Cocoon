/**
 * @module APIDeprecation
 * @description This module provides the APIDeprecation service, which is used to
 * report and handle the usage of deprecated APIs by extensions.
 */

import { Layer } from "effect";

import { Live as LiveLog } from "../Log.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";

/**
 * The live implementation Layer for the APIDeprecation service.
 * It depends on the Log service to output warnings.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveLog));
