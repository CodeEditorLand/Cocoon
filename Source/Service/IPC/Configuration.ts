

/**
 * @module Configuration (IPC)
 * @description Defines the configuration interface and service Tag for the
 * IPC service, specifying the network addresses for communication.
 */

import { Context } from "effect";

// This is the data structure for the configuration.
export interface IPCConfiguration {
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
 * The `Context.Tag` for the `IPCConfiguration` service.
 * This allows the configuration to be provided and injected as a formal dependency.
 */
export default class IPCConfigurationService extends Context.Tag(
	"Service/IPCConfiguration",
)<IPCConfigurationService, IPCConfiguration>() {}
