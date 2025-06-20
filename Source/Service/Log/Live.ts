

/**
 * @module Live (Log)
 * @description The live implementation `Layer` for the Log service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Log service.
 * It has no external dependencies.
 */
export default Layer.effect(Service, Definition);
