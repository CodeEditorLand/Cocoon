/**
 * @module IPC
 * @description This module provides the primary Inter-Process Communication (IPC)
 * service for Cocoon. It provides a managed gRPC connection to and from the
 * Mountain host, exposing high-level effects for communication.
 */

import { Layer } from "effect";

import { Live as LiveClient } from "./IPC/Client.js";
import { Tag as ConfigTag, type Configuration } from "./IPC/Configuration.js";
import { Definition } from "./IPC/Definition.js";
import { Live as LiveDispatcher } from "./IPC/Dispatcher.js";
import { Live as LiveProtocolAdapter } from "./IPC/ProtocolAdapter.js";
import { Live as LiveServer } from "./IPC/Server.js";
import { Tag } from "./IPC/Service.js";

export { Tag, type Interface } from "./IPC/Service.js";
export {
	type Configuration,
	Tag as ConfigurationTag,
} from "./IPC/Configuration.js";
export * from "./IPC/Error.js";

/**
 * The composed "live" Layer for the IPC service.
 *
 * This master layer assembles all the necessary sub-layers for the gRPC client,
 * server, dispatcher, and protocol adapter. It is the single layer that should be
 * provided to the main application to enable IPC capabilities.
 *
 * It requires an `IPC.Configuration` object to be provided to it, which contains the
 * necessary server addresses.
 *
 * @param Config An object containing the `MountainAddress` and `CocoonAddress`.
 * @returns A self-contained `Layer` that provides the `IPC.Service`.
 */
export function Live(Config: Configuration) {
	// Create a layer that provides the necessary configuration.
	const ConfigLayer = Layer.succeed(ConfigTag, Config);

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
}
