/**
 * @module Client (IPC)
 * @description Provides a managed gRPC client connection from `Cocoon` to
 * `Mountain`, exposing the connection as a `Layer` that can be used by other
 * services.
 */

import { Layer } from "effect";

import { Acquire } from "./Client/Acquire.js";
import { Tag, type Interface as ClientService } from "./Client/Service.js";
import type { Configuration } from "./Configuration.js";
import type { gRPCConnectionError } from "./Error.js";

/**
 * The live implementation `Layer` for the gRPC Client service.
 *
 * This is a scoped layer that uses the `Acquire` effect (which internally uses
 * `acquireRelease`) to manage the client's lifecycle. It ensures the gRPC
 * client is created and connected when the application starts and is
 * gracefully closed when the application shuts down.
 *
 * This layer depends on the `Configuration.Tag` to get the `Mountain` server address.
 */
export const Live: Layer.Layer<
	ClientService,
	gRPCConnectionError,
	Configuration
> = Layer.scoped(Tag, Acquire);
