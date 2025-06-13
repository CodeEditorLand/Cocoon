/**
 * @module Live (IPC)
 * @description This file composes and provides the main, live implementation layer for the
 * entire Inter-Process Communication (IPC) service.
 */

import { Layer } from "effect";

import { Live as LiveClient } from "./Client.js";
import { Config, ConfigTag } from "./Config.js";
import { Definition } from "./Definition.js";
import { Live as LiveDispatcher } from "./Dispatcher.js";
import { Live as LiveProtocolAdapter } from "./ProtocolAdapter.js";
import { Live as LiveServer } from "./Server.js";
import { Tag } from "./Service.js";

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
	// The dependencies are wired from the inside out.
	const ComposedLayer = Layer.provide(
		Layer.effect(Tag, Definition), // The top-level service implementation.
		Layer.mergeAll(
			// It depends on all of these other services.
			LiveClient,
			LiveServer,
			LiveDispatcher,
			LiveProtocolAdapter,
		),
	);

	// Finally, provide the configuration to the entire composed stack.
	return Layer.provide(ComposedLayer, ConfigLayer);
};
