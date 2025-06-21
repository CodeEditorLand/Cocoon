/**
 * @module Live (IPC/Client)
 * @description Provides a managed gRPC client connection from `Cocoon` to
 * `Mountain`, exposing the connection as a `Layer` that can be used by other
 * services.
 */

import { Layer } from "effect";

import IPCConfigurationService from "../Configuration.js";
import type gRPCConnectionError from "../Error/gRPCConnectionError.js";
import Acquire from "./Acquire.js";
import Service from "./Service.js";

/**
 * The live implementation `Layer` for the gRPC Client service.
 */
const Live: Layer.Layer<Service, gRPCConnectionError, IPCConfigurationService> =
	Layer.scoped(Service, Acquire);

export default Live;
