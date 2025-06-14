/**
 * @module Server (IPC)
 * @description Provides a `Layer` for the managed gRPC server, which listens
 * for incoming requests from the `Mountain` backend.
 */

import { Layer } from "effect";

import type { Configuration } from "./Configuration.js";
import { Live as LiveDispatcher } from "./Dispatcher.js";
import type { gRPCConnectionError } from "./Error.js";
import { Acquire } from "./Server/Acquire.js";
import { Tag, type Interface as ServerService } from "./Server/Service.js";

/**
 * The live implementation `Layer` for the gRPC Server service.
 */
export const Live: Layer.Layer<
	ServerService,
	gRPCConnectionError,
	Configuration | Dispatcher.Interface
> = Layer.scoped(Tag, Acquire).pipe(Layer.provide(LiveDispatcher));
