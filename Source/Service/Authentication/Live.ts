

/**
 * @module Live (Authentication)
 * @description The live implementation Layer for the Authentication service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Authentication service.
 * It depends on the IPC and Log services for communication.
 */
export default Layer.effect(Service, Definition);
