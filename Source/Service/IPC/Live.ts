/*
 * File: Cocoon/Source/Service/IPC/Live.ts
 * Responsibility: Provides the composed "live" Layer for the entire IPC service.
 * Modified: 2025-06-18 11:00:00 UTC
 */

/**
 * @module Live (IPC)
 * @description This module provides the composed "live" Layer for the entire IPC service.
 * It brings together the client, server, dispatcher, and protocol adapter into
 * a single, manageable layer.
 */

import { Layer } from "effect";

import CancellationLive from "../Cancellation/Live.js";
import ClientLive from "./Client/Live.js";
import type IPCConfigurationService from "./Configuration.js";
import Definition from "./Definition.js";
import DispatcherLive from "./Dispatcher/Live.js";
import ProtocolAdapterLive from "./ProtocolAdapter/Live.js";
import ServerLive from "./Server/Live.js";
import Service from "./Service.js";

/**
 * A layer that bundles all the internal dependencies required by the main IPC service.
 * This layer itself requires the IPCConfigurationService to build its sub-components.
 */
const IPCInternalDepsLive = Layer.mergeAll(
	ClientLive,
	ServerLive,
	DispatcherLive,
	ProtocolAdapterLive,
	// The Dispatcher requires the CancellationService, so we include it here.
	CancellationLive,
);

/**
 * The main `IPCService` layer definition.
 * This layer declares its dependencies on the internal components.
 */
const IPCServiceLive = Layer.effect(Service, Definition);

/**
 * The final, composed "live" Layer for the IPC service.
 *
 * This layer is constructed by providing the internal dependencies layer
 * to the main IPC service layer. This resolves all dependencies except for
 * the external `IPCConfigurationService`, which is correctly exposed as
 * the final requirement.
 *
 * The potential `gRPCConnectionError` from the internal dependencies is treated
 * as a fatal defect using `Layer.orDie`, ensuring the final layer has a `never`
 * error channel.
 */
const IPCLive: Layer.Layer<Service, never, IPCConfigurationService> =
	IPCServiceLive.pipe(Layer.provide(IPCInternalDepsLive), Layer.orDie);

export default IPCLive;
