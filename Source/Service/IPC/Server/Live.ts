/*
 * File: Cocoon/Source/Service/IPC/Server/Live.ts
 * Responsibility: Provides a managed gRPC server Layer for Cocoon, which listens for incoming requests from the Mountain backend.
 * Modified: 2025-06-17 11:19:34 UTC
 * Dependency: ../Configuration.js, ../Dispatcher/Service.js, ../Error.js, ./Acquire.js, ./Service.js, effect
 */

/**
 * @module Live (IPC/Server)
 * @description Provides a `Layer` for the managed gRPC server, which listens
 * for incoming requests from the `Mountain` backend.
 */

import { Layer } from "effect";

import type { IPCConfigurationService } from "../Configuration.js";
import type DispatcherService from "../Dispatcher/Service.js";
import type { gRPCConnectionError } from "../Error.js";
import Acquire from "./Acquire.js";
import Service from "./Service.js";

/**
 * The live implementation `Layer` for the gRPC Server service.
 *
 * This scoped layer creates and manages the lifecycle of the gRPC server instance.
 * It correctly declares its dependencies on `DispatcherService` and `IPCConfigurationService`.
 */
const Live: Layer.Layer<
	Service,
	gRPCConnectionError,
	DispatcherService | IPCConfigurationService
> = Layer.scoped(Service, Acquire);

export default Live;
