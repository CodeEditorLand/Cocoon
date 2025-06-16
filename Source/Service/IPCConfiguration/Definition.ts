/**
 * @module Definition (IPCConfiguration)
 * @description Defines the data structure for the IPC service configuration.
 */

export default interface IPCConfiguration {
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
