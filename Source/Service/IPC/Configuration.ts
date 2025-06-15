/**
 * @module Configuration (IPC)
 * @description Defines the configuration interface for the
 * IPC service, specifying the network addresses for communication.
 * This is a plain type, not a service.
 */

export default interface IPCConfigurationService {
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
