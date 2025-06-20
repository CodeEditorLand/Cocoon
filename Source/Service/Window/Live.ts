

/**
 * @module Live (Window)
 * @description The live implementation Layer for the Window service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Window service.
 */
export default Layer.effect(Service, Definition);
