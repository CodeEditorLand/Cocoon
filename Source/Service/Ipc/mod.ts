/**
 * @module Ipc
 * @description This module provides the primary Inter-Process Communication (IPC)
 * service for Cocoon. It provides a managed gRPC connection to and from the
 * Mountain host, exposing high-level effects for communication.
 */

import { Layer } from "effect";

import { Live as LiveClient } from "./Client/mod.js";
import { ConfigTag, type Config } from "./Config.js";
import { Definition } from "./Definition.js";
import { Live as LiveDispatcher } from "./Dispatcher/mod.js";
import { Live as LiveProtocolAdapter } from "./ProtocolAdapter/mod.js";
import { Live as LiveServer } from "./Server/mod.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export { type Config, ConfigTag } from "./Config.js";
export * from "./Error.js";

/**
 * The composed "live" Layer for the IpcProvider service.
 *
 * This master layer assembles all the necessary sub-layers for the gRPC client,
 * server, dispatcher, and protocol adapter. It is the single layer that should be
 * provided to the main application to enable IPC capabilities.
 *
 * It requires an `Ipc.Config` object to be provided to it, which contains the
 * necessary server addresses.
 *
 * @param Configuration - An object containing the `MountainAddress` and `CocoonAddress`.
 * @returns A self-contained `Layer` that provides the `Ipc.Service`.
 */
export const Live = (Configuration: Config) => {
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
