/*
 * File: Cocoon/Source/Service/IPC/Live.ts
 * Responsibility: Provides the primary IPC service for the Cocoon sidecar, implementing gRPC communication with the Mountain backend to enable VS Code extension hosting and interaction.
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
import Definition from "./Definition.js";
import { Live as DispatcherLive } from "./Dispatcher.js";
import { Live as ProtocolAdapterLive } from "./ProtocolAdapter.js";
import { Live as ServerLive } from "./Server.js";
import Service from "./Service.js";

/**
 * The composed "live" Layer for the IPC service.
 *
 * This layer merges the individual parts of the IPC system. The final merged
 * layer will expose all dependencies, which must be provided at the composition root.
 */
const IPCLive = Layer.mergeAll(
	Layer.effect(Service, Definition),
	ClientLive,
	ServerLive,
	DispatcherLive,
	ProtocolAdapterLive,
);

export default IPCLive;
