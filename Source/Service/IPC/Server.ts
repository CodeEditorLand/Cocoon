/**
 * @module Server (IPC)
 * @description Provides a `Layer` for the managed gRPC server, which listens
 * for incoming requests from the `Mountain` backend.
 */

import { Layer } from "effect";

import { Configuration } from "./Configuration.js";
import { Dispatcher } from "./Dispatcher.js";
import type { gRPCConnectionError } from "./Error.js";
import { Acquire } from "./Server/Acquire.js";
import { Server as ServerTag } from "./Server/Service.js";

export namespace Server {
	export const Tag = ServerTag;
	export type Interface = ServerTag;
	/**
	 * The live implementation `Layer` for the gRPC Server service.
	 *
	 * This scoped layer creates and manages the lifecycle of the gRPC server instance,
	 * ensuring it starts with the application and is shut down gracefully. It
	 * composes the `Acquire` effect with the `LiveDispatcher` layer, which is a
	 * dependency for creating the server's request handlers.
	 */
	export const Live: Layer.Layer<
		Interface,
		gRPCConnectionError,
		Configuration
	> = Layer.scoped(Tag, Acquire).pipe(Layer.provide(Dispatcher.Live));
}
