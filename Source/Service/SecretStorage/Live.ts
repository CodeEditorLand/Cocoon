

/**
 * @module Live (SecretStorage)
 * @description The live implementation Layer for the SecretStorage service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the SecretStorage service.
 * It depends on the IPC and Log services.
 */

export default Layer.effect(Service, Definition);
