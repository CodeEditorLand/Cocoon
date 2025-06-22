/*
 * File: Cocoon/Source/Service/IPC/Live.ts
 *
 * This file provides the composed "live" Layer for the entire IPC service.
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
 * This is the collection of all sub-components of the IPC system.
 */
const IPCInternalComponents = Layer.mergeAll(
	ClientLive,
	ServerLive,
	DispatcherLive,
	ProtocolAdapterLive,
	// The Dispatcher requires the CancellationService
	CancellationLive,
);

/**
 * A fully resolved layer for all internal IPC dependencies.
 * By providing the component layer to itself, we resolve all cross-dependencies
 * between the sub-services (e.g., ProtocolAdapter needing ClientService).
 * The only remaining dependency is the external IPCConfigurationService.
 */
const IPCInternalDepsLive = IPCInternalComponents.pipe(
	Layer.provide(IPCInternalComponents),
);

/**
 * The main `IPCService` layer definition.
 * This layer declares its dependencies on the internal components.
 */
const IPCServiceLive = Layer.effect(Service, Definition);

/**
 * The final, composed "live" Layer for the IPC service.
 *
 * This layer is constructed by providing the fully resolved internal dependencies layer
 * to the main IPC service layer. The potential `gRPCConnectionError` from the
 * internal dependencies is treated as a fatal defect, ensuring the final layer has a
 * `never` error channel.
 */
const IPCLive: Layer.Layer<Service, never, IPCConfigurationService> =
	IPCServiceLive.pipe(Layer.provide(IPCInternalDepsLive), Layer.orDie);

export default IPCLive;
