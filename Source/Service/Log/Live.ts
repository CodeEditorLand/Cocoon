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
const Live = Layer.effect(Service, Definition);

export default Live;

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
const Live = Layer.effect(Service, Definition);

export default Live;
