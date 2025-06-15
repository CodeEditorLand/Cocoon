/**
 * @module Live (APIDeprecation)
 * @description The live implementation `Layer` for the APIDeprecation service.
 */

import { Layer } from "effect";

import { Live as LogLive } from "../Log.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the APIDeprecation service.
 * It depends on the Log service to output warnings.
 */
const Live = Layer.effect(Service, Definition).pipe(Layer.provide(LogLive));

export default Live;
