

/**
 * @module Live (ESMInterceptor)
 * @description The live implementation layer for the ESMInterceptor service.
 */

import { Layer } from "effect";

import type LogService from "../../Service/Log/Service.js";
import type APIFactoryService from "../APIFactory/Service.js";
import type ExtensionPathService from "../ExtensionPath/Service.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation layer for the ESMInterceptor service.
 * It correctly declares its dependencies on the APIFactory, ExtensionPath, and Log services.
 */
const Live: Layer.Layer<
	Service,
	never,
	APIFactoryService | ExtensionPathService | LogService
> = Layer.effect(Service, Definition);

export default Live;
