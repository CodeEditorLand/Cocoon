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
 * This layer merges the individual parts of the IPC system. The final merged
 * layer will expose all dependencies, which must be provided at the composition root.
 */
export default Layer.mergeAll(
	Layer.effect(Service, Definition),
	ClientLive,
	ServerLive,
	DispatcherLive,
	ProtocolAdapterLive,
);
