/**
 * @module Live (Extension)
 * @description The live implementation Layer for the Extension service.
 */

import { Layer } from "effect";

import ExtensionHostService from "../../Core/ExtensionHost/Service.js";
import InitDataService from "../InitData/Service.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Extension service.
 * It correctly declares its dependency on the core ExtensionHost and InitData services.
 */
const Live: Layer.Layer<
	Service,
	never,
	ExtensionHostService | InitDataService
> = Layer.effect(Service, Definition);

export default Live;
