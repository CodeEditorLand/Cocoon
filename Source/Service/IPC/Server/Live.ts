/*
 * File: Cocoon/Source/Service/IPC/Server/Live.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 11:19:34 UTC
 * Dependency: ../Configuration.js, ../Dispatcher.js, ../Error.js, ./Acquire.js, ./Service.js, effect
 */

/**
 * @module Live (IPC/Server)
 * @description Provides a `Layer` for the managed gRPC server, which listens
 * for incoming requests from the `Mountain` backend.
 */

import { Layer } from "effect";

import { IPCConfigurationService } from "../Configuration.js";
import { Live as DispatcherLive } from "../Dispatcher.js";
import type { gRPCConnectionError, IPCError } from "../Error.js";
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
	gRPCConnectionError | IPCError,
	IPCConfigurationService
> = Layer.scoped(Service, Acquire).pipe(Layer.provide(DispatcherLive));

export default Live;
