/*
 * File: Cocoon/Source/Service/IPC/Live.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ./Client.js, ./Definition.js, ./Dispatcher.js, ./ProtocolAdapter.js, ./Server.js, ./Service.js, effect
 */

/**
 * @module Live (IPC)
 * @description This module provides the composed "live" Layer for the entire IPC service.
 * It brings together the client, server, dispatcher, and protocol adapter into
 * a single, manageable layer.
 */

import { Layer } from "effect";

import { Live as ClientLive } from "./Client.js";
import { type IPCConfigurationService } from "./Configuration.js";
import Definition from "./Definition.js";
import { Live as DispatcherLive } from "./Dispatcher.js";
import type { gRPCConnectionError, IPCError } from "./Error.js";
import { Live as ProtocolAdapterLive } from "./ProtocolAdapter.js";
import { Live as ServerLive } from "./Server.js";
import Service from "./Service.js";

/**
 * The composed "live" Layer for the IPC service.
 *
 * This layer composes the individual parts of the IPC system (Client, Server, Dispatcher, Adapter)
 * and provides them to the main IPC service definition. The resulting layer depends on
 * `IPCConfigurationService` to function.
 */
const Live: Layer.Layer<
	Service,
	gRPCConnectionError | IPCError,
	IPCConfigurationService
> = Layer.effect(Service, Definition).pipe(
	Layer.provide(
		Layer.mergeAll(
			ClientLive,
			ServerLive,
			DispatcherLive,
			ProtocolAdapterLive,
		),
	),
);

export default Live;
