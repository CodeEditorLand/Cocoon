/**
 * @module IPC
 * @description This module provides the primary Inter-Process Communication (IPC)
 * service for Cocoon. It provides a managed gRPC connection to and from the
 * Mountain host, exposing high-level effects for communication.
 */

import { Layer } from "effect";

import { Live as LiveClient } from "./Ipc/Client.js";
import { ConfigTag, type Configuration } from "./Ipc/Configuration.js";
import { Definition } from "./Ipc/Definition.js";
import { Live as LiveDispatcher } from "./Ipc/Dispatcher.js";
import { Live as LiveProtocolAdapter } from "./Ipc/ProtocolAdapter.js";
import { Live as LiveServer } from "./Ipc/Server.js";
import { Tag } from "./Ipc/Service.js";

export { Tag, type Interface } from "./Ipc/Service.js";
export { type Configuration, ConfigTag } from "./Ipc/Configuration.js";
export * from "./Ipc/Error.js";

/**
 * The composed "live" Layer for the IPCProvider service.
 *
 * This master layer assembles all the necessary sub-layers for the gRPC client,
 * server, dispatcher, and protocol adapter. It is the single layer that should be
 * provided to the main application to enable IPC capabilities.
 *
 * It requires an `IPC.Configuration` object to be provided to it, which contains the
 * necessary server addresses.
 *
 * @param Configuration - An object containing the `MountainAddress` and `CocoonAddress`.
 * @returns A self-contained `Layer` that provides the `IPC.Service`.
 */
export const Live = (Configuration: Configuration) => {
	// Create a layer that provides the necessary configuration.
	const ConfigLayer = Layer.succeed(ConfigTag, Configuration);

	// Compose all the individual service layers together.
	const ComposedLayer = Layer.provide(
		Layer.effect(Tag, Definition),
		Layer.mergeAll(
			LiveClient,
			LiveServer,
			LiveDispatcher,
			LiveProtocolAdapter,
		),
	);

	// Finally, provide the configuration to the entire composed stack.
	return Layer.provide(ComposedLayer, ConfigLayer);
};
