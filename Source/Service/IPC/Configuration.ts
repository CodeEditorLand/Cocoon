/**
 * @module Configuration (IPC)
 * @description Defines the configuration interface and `Context.Tag` for the
 * IPC service, specifying the network addresses for communication.
 */

import { Context } from "effect";

/**
 * The configuration required for the IPC service.
 */
export interface Configuration {
	/**
	 * The network address of the `Mountain` gRPC server.
	 * @example "localhost:50051"
	 */
	readonly MountainAddress: string;
	/**
	 * The network address where the `Cocoon` gRPC server should listen.
	 * @example "localhost:50052"
	 */
	readonly CocoonAddress: string;
}

/**
 * The `Context.Tag` for the IPC configuration.
 */
export const Tag = Context.Tag("IPC/Configuration")<Configuration>;
