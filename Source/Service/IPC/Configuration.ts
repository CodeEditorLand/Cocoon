/*
 * File: Cocoon/Source/Service/IPC/Configuration.ts
 * Role: Defines the configuration interface and provides the default "live" implementation
 *       for the IPC service using Effect.Service.
 * Responsibilities:
 *   - Declare the data structure for IPC network configuration.
 *   - Provide the `Effect.Service` class and its default Layer that reads from environment variables.
 */

import { Effect } from "effect";

// This is the data structure for the configuration.
export interface IPCConfiguration {
	readonly MountainAddress: string;
	readonly CocoonAddress: string;
}

/**
 * The `Effect.Service` for the `IPCConfiguration`.
 * This allows the configuration to be provided and injected as a formal dependency.
 * The default implementation reads from environment variables.
 */
export class Configuration extends Effect.Service<IPCConfiguration>()(
	"Service/IPCConfiguration",
	{
		// `sync` is used because reading from `process.env` is a synchronous operation.
		sync: () => ({
			MountainAddress: process.env["MOUNTAIN_ADDR"] ?? "localhost:50051",
			CocoonAddress: process.env["COCOON_ADDR"] ?? "localhost:50052",
		}),
	},
) {}
