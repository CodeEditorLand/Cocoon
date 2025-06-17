/**
 * @module Live (WorkSpace)
 * @description The live implementation Layer for the WorkSpace service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the WorkSpace service.
 */
export default Layer.effect(Service, Definition);
