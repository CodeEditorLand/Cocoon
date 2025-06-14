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
 * @param Config An object containing the `MountainAddress` and `CocoonAddress`.
 * @returns A self-contained `Layer` that provides the `IPC.Service`.
 */
export function Live(Config: Configuration) {
	const ConfigLayer = Layer.succeed(ConfigTag, Config);

	const DependenciesLayer = Layer.mergeAll(
		LiveClient,
		LiveServer,
		LiveDispatcher,
		LiveProtocolAdapter,
	).pipe(Layer.provide(ConfigLayer));

	return Layer.effect(Tag, Definition).pipe(Layer.provide(DependenciesLayer));
}
