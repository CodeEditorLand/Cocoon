/*
 * File: Cocoon/Source/Service/IPC/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:21 UTC
 * Dependency: ./Client/Live.js, ./Definition.js, ./Dispatcher/Live.js, ./ProtocolAdapter/Live.js, ./Server/Live.js, ./Service.js, effect
 */

/**
 * @module Live (IPC)
 * @description This module provides the composed "live" Layer for the entire IPC service.
 * It brings together the client, server, dispatcher, and protocol adapter into
 * a single, manageable layer.
 */

import { Layer } from "effect";

import ClientLive from "./Client/Live.js";
import Definition from "./Definition.js";
import DispatcherLive from "./Dispatcher/Live.js";
import ProtocolAdapterLive from "./ProtocolAdapter/Live.js";
import ServerLive from "./Server/Live.js";
import Service from "./Service.js";

/**
 * The composed "live" Layer for the IPC service.
 *
 * This layer composes the individual parts of the IPC system. The final layer
 * exposes the high-level IPC.Service and requires the dependencies of its
 * sub-layers (like IPCConfigurationService).
 */
const IPCLive = Layer.effect(Service, Definition).pipe(
	Layer.provide(
		Layer.mergeAll(
			ClientLive,
			ServerLive,
			DispatcherLive,
			ProtocolAdapterLive,
		),
	),
);

export default IPCLive;
