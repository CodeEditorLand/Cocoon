

/**
 * @module Live (Document)
 * @description The live implementation Layer for the Document service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Document service.
 * It depends on the IPC service to receive updates from the host.
 */
export default Layer.effect(Service, Definition);
