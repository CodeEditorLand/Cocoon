/*
 * File: Cocoon/Source/Service/IPC/Live.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ./Client.js, ./Definition.js, ./Dispatcher.js, ./ProtocolAdapter.js, ./Server.js, ./Service.js, effect
 */

/**
 * @module Live (IPC)
 * @description This module provides the primary Inter-Process Communication (IPC)
 * service for Cocoon. It provides a managed gRPC connection to and from the
 * Mountain host, exposing high-level effects for communication.
 */

import { Layer } from "effect";

import { Live as ClientLive } from "./Client.js";
import {
	IPCConfigurationService,
	type IPCConfiguration,
} from "./Configuration.js";
import Definition from "./Definition.js";
import { Live as DispatcherLive } from "./Dispatcher.js";
import { Live as ProtocolAdapterLive } from "./ProtocolAdapter.js";
import { Live as ServerLive } from "./Server.js";
import Service from "./Service.js";

/**
 * The composed "live" Layer for the IPC service.
 * @param Configuration An object containing the `MountainAddress` and `CocoonAddress`.
 * @returns A self-contained `Layer` that provides the `IPC.Service`.
 */
export default (Configuration: IPCConfiguration) => {
	const ConfigLayer = Layer.succeed(IPCConfigurationService, Configuration);

	const DependenciesLayer = Layer.mergeAll(
		ClientLive,
		ServerLive,
		DispatcherLive,
		ProtocolAdapterLive,
	).pipe(Layer.provide(ConfigLayer));

	return Layer.effect(Service, Definition).pipe(
		Layer.provide(DependenciesLayer),
	);
};
