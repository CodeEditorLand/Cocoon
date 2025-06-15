/**
 * @module Live (IPC/Server)
 * @description Provides a `Layer` for the managed gRPC server, which listens
 * for incoming requests from the `Mountain` backend.
 */

import { Layer } from "effect";

import type IPCConfigurationService from "../Configuration.js";
import { Live as DispatcherLive } from "../Dispatcher.js";
import type { gRPCConnectionError } from "../Error.js";
import Acquire from "./Acquire.js";
import Service from "./Service.js";

/**
 * The live implementation `Layer` for the gRPC Server service.
 *
 * This scoped layer creates and manages the lifecycle of the gRPC server instance,
 * ensuring it starts with the application and is shut down gracefully. It
 * composes the `Acquire` effect with the `DispatcherLive` layer, which is a
 * dependency for creating the server's request handlers.
 */
const Live: Layer.Layer<
	Service,
	gRPCConnectionError | Error,
	IPCConfigurationService
> = Layer.scoped(Service, Acquire).pipe(Layer.provide(DispatcherLive));

export default Live;
