/*
 * File: Cocoon/Source/Service/IPC/Configuration.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: effect
 * Export: IPCConfiguration, IPCConfigurationService
 */

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

// FIX: Define and export the Context.Tag that other services can depend on.
// The class-based syntax is the modern and correct way to define a Tag.
export class IPCConfigurationService extends Context.Tag(
	"Service/IPCConfiguration",
)<IPCConfigurationService, IPCConfiguration>() {}
