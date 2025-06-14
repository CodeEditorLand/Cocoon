/**
 * @module Live (IPC)
 * @description This module provides the primary Inter-Process Communication (IPC)
 * service for Cocoon. It provides a managed gRPC connection to and from the
 * Mountain host, exposing high-level effects for communication.
 */

import { Layer } from "effect";

import ClientLive from "./Client/Live.js";
import ConfigurationService from "./Configuration.js";
import Definition from "./Definition.js";
import DispatcherLive from "./Dispatcher/Live.js";
import ProtocolAdapterLive from "./ProtocolAdapter/Live.js";
import ServerLive from "./Server/Live.js";
import Service from "./Service.js";

/**
 * The composed "live" Layer for the IPC service.
 * @param Config An object containing the `MountainAddress` and `CocoonAddress`.
 * @returns A self-contained `Layer` that provides the `IPC.Service`.
 */
export default function (Config: {
	MountainAddress: string;
	CocoonAddress: string;
}) {
	const ConfigLayer = Layer.succeed(ConfigurationService, Config);

	const DependenciesLayer = Layer.mergeAll(
		ClientLive,
		ServerLive,
		DispatcherLive,
		ProtocolAdapterLive,
	).pipe(Layer.provide(ConfigLayer));

	return Layer.effect(Service, Definition).pipe(
		Layer.provide(DependenciesLayer),
	);
}
