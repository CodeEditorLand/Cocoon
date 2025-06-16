/**
 * @module Live (IPCConfiguration)
 * @description Provides the live implementation layer for the IPCConfiguration service.
 */

import { Layer } from "effect";

import type Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * A factory function that creates a live `Layer` for the `IPCConfiguration` service.
 * This layer simply succeeds with the provided configuration object.
 * @param Config The configuration data object.
 * @returns A `Layer` that provides the `IPCConfiguration.Service`.
 */
const Live = (Config: Definition) => Layer.succeed(Service, Config);

export default Live;
