/*
 * File: Cocoon/Source/Service/IPC/Live.ts
 * Role: Provides the composed "live" Layer for the entire IPC service.
 * Responsibilities:
 *   - Composes all individual IPC sub-component layers (`Client`, `Server`, `Dispatcher`,
 *     `ProtocolAdapter`) into a single, manageable layer.
 *   - Resolves all internal dependencies within the IPC system.
 */

import { Layer } from "effect";

import { Definition } from "./Definition.js";
import { IPC } from "./Service.js";
import type { Configuration as IPCConfiguration } from "./Service.js";
import type { GRPCConnectionProblem } from "./Error.js";

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
 * The only remaining dependency is the external `IPC.Configuration`.
 */
const IPCInternalDependenciesLive = IPCInternalComponents.pipe(
	Layer.provide(IPCInternalComponents),
);

/**
 * The main `IPCService` layer definition.
 * This layer declares its dependencies on the internal components.
 */
const IPCServiceLive = Layer.effect(IPC, Definition);

/**
 * The final, composed "live" `Layer` for the IPC service.
 *
 * This layer is constructed by providing the fully resolved internal dependencies layer
 * to the main IPC service layer. The potential `GRPCConnectionProblem` from the
 * internal dependencies is treated as a fatal defect, ensuring the final layer has a
 * `never` error channel.
 */
const Live: Layer.Layer<IPC, never, IPCConfiguration> = IPCServiceLive.pipe(
	Layer.provide(IPCInternalDependenciesLive),
	Layer.orDie,
);

export default Live;
