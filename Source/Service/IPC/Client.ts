/**
 * @module Client (IPC)
 * @description Provides a managed gRPC client connection from `Cocoon` to
 * `Mountain`, exposing the connection as a `Layer` that can be used by other
 * services.
 */

import { Layer } from "effect";

import { Acquire } from "./Client/Acquire.js";
import { Client as ClientTag } from "./Client/Service.js";
import { Configuration } from "./Configuration.js";
import type { gRPCConnectionError } from "./Error.js";

export namespace Client {
	export const Tag = ClientTag;
	export type Interface = ClientTag;

	/**
	 * The live implementation `Layer` for the gRPC Client service.
	 */
	export const Live: Layer.Layer<
		Interface,
		gRPCConnectionError,
		Configuration
	> = Layer.scoped(Tag, Acquire);
}
