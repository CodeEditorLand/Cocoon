

/**
 * @module Live (Localization)
 * @description The live implementation Layer for the Localization service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Localization service.
 * It depends on the IPC and InitData services.
 */
export default Layer.effect(Service, Definition);
