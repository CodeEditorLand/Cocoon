/**
 * @module ProposedAPI
 * @description This module provides the ProposedAPI service, which checks the
 * enablement status of experimental VS Code APIs for extensions.
 */

import { Layer } from "effect";

import { Live as LogLive } from "./Log.js";
import Definition from "./ProposedAPI/Definition.js";
import Service from "./ProposedAPI/Service.js";

export { default as Service } from "./ProposedAPI/Service.js";

/**
 * The live implementation Layer for the ProposedAPI service.
 * It depends on the Log and InitData services.
 */
export const Live = Layer.effect(Service, Definition).pipe(
	Layer.provide(LogLive),
);
