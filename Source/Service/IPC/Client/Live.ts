/**
 * @module Live (IPC/Client)
 * @description Provides a managed gRPC client connection from `Cocoon` to
 * `Mountain`, exposing the connection as a `Layer` that can be used by other
 * services.
 */

import { Layer } from "effect";

import type ConfigurationService from "../Configuration.js";
import type { gRPCConnectionError } from "../Error.js";
import Acquire from "./Acquire.js";
import Service from "./Service.js";

/**
 * The live implementation `Layer` for the gRPC Client service.
 */
export default Layer.scoped(Service, Acquire) satisfies Layer.Layer<
	any,
	gRPCConnectionError,
	typeof ConfigurationService
>;
