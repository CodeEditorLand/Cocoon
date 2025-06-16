/*
 * File: Cocoon/Source/Service/IPC/Client/Live.ts
 * Responsibility: 
 * Modified: 2025-06-16 14:41:22 UTC
 * Dependency: ../Configuration.js, ../Error.js, ./Acquire.js, ./Service.js, effect
 */

/**
 * @module Live (IPC/Client)
 * @description Provides a managed gRPC client connection from `Cocoon` to
 * `Mountain`, exposing the connection as a `Layer` that can be used by other
 * services.
 */

import { Layer } from "effect";

import type { IPCConfiguration } from "../Configuration.js";
import type { gRPCConnectionError } from "../Error.js";
import Acquire from "./Acquire.js";
import Service from "./Service.js";

/**
 * The live implementation `Layer` for the gRPC Client service.
 */
const Live: Layer.Layer<Service, gRPCConnectionError, IPCConfiguration> =
	Layer.scoped(Service, Acquire);

export default Live;
