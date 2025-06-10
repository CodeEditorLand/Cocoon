/**
 * @module Server
 * @description Provides a `Layer` for the managed gRPC server, which listens
 * for incoming requests from the `Mountain` backend.
 */

import { Layer } from "effect";

import type { Config } from "../Config.js";
import { Live as LiveDispatcher } from "../Dispatcher/mod.js";
import type { GrpcConnectionError } from "../Error.js";
import { Acquire } from "./Acquire.js";
import { Tag, type Service } from "./Service.js";

/**
 * The live implementation `Layer` for the gRPC Server service.
 *
 * This scoped layer creates and manages the lifecycle of the gRPC server instance,
 * ensuring it starts with the application and is shut down gracefully. It
 * composes the `Acquire` effect with the `LiveDispatcher` layer, which is a
 * dependency for creating the server's request handlers.
 */
export const Live: Layer.Layer<Service, GrpcConnectionError, Config> =
	Layer.scoped(Tag, Acquire).pipe(Layer.provide(LiveDispatcher));
