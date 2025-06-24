/*
 * File: Cocoon/Source/Service/IPC/Type.ts
 * Role: Defines the configuration interface for the IPC service.
 * Responsibilities:
 *   - Declare the data structure for IPC network configuration.
 */

/**
 * Defines the network addresses required for IPC communication between
 * the Cocoon (extension host) and Mountain (native host) processes.
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
