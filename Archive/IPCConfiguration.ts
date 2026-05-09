/**
 * @module IPCConfiguration
 * @description Defines the service for Inter-Process Communication (IPC)
 * configuration, providing network addresses for the Cocoon and Mountain processes.
 * This service is a foundational part of the application, reading its values
 * from environment variables.
 */

import { Effect } from "effect";

/**
 * @interface IPCConfiguration
 * @description The data structure holding the network addresses for IPC.
 */
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
 * @class IPCConfiguration
 * @description The `Effect.Service` for IPC configuration. This service provides
 * the network addresses required for communication between the Cocoon (extension host)
 * and Mountain (native host) processes. The default implementation reads these
 * values from environment variables (`MOUNTAIN_ADDR`, `COCOON_ADDR`) with
 * sensible defaults.
 */
export class IPCConfigurationService extends Effect.Service<IPCConfigurationService>()(
	"Service/IPCConfiguration",

	{
		effect: Effect.gen(function* () {
			// This is a synchronous effect, but we use Effect.gen for consistency with the protocol.
			return {
				MountainAddress:
					process.env["MOUNTAIN_ADDR"] ?? "localhost:50051",
				CocoonAddress: process.env["COCOON_ADDR"] ?? "localhost:50052",
			};
		}),
	},
) {}
