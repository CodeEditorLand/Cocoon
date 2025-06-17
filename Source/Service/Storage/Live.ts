/**
 * @module Live (Storage)
 * @description The live implementation Layer for the Storage service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Storage service.
 */
export default Layer.effect(Service, Definition);
