/**
 * @module Client (IPC)
 * @description Provides a managed gRPC client connection from `Cocoon` to
 * `Mountain`, exposing the connection as a `Layer` that can be used by other
 * services.
 */

import { Layer } from "effect";

import type { Config } from "../Config.js";
import { Acquire } from "./Acquire.js";
import { Tag, type Service } from "./Service.js";

/**
 * The live implementation `Layer` for the gRPC Client service.
 *
 * This is a scoped layer that uses the `Acquire` effect (which internally uses
 * `acquireRelease`) to manage the client's lifecycle. It ensures the gRPC
 * client is created and connected when the application starts and is
 * gracefully closed when the application shuts down.
 *
 * This layer depends on the `ConfigTag` to get the `Mountain` server address.
 */
export const Live: Layer.Layer<Service, never, Config> = Layer.scoped(
	Tag,
	Acquire,
);
