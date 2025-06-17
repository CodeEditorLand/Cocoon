/**
 * @module Live (Configuration)
 * @description The live implementation Layer for the Configuration service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Configuration service.
 * It depends on the IPC and Log services.
 */
export default Layer.effect(Service, Definition);
