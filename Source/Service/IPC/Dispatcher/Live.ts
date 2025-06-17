/*
 * File: Cocoon/Source/Service/IPC/Dispatcher/Live.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:33 UTC
 * Dependency: ../../Cancellation.js, ../ProtocolAdapter.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (IPC/Dispatcher)
 * @description Provides the live implementation Layer for the Dispatcher service.
 */

import { Layer } from "effect";

import { CancellationLive } from "../../Cancellation.js";
import { Live as ProtocolAdapterLive } from "../ProtocolAdapter.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Dispatcher service.
 * It depends on the ProtocolAdapter (for the underlying transport) and the
 * Cancellation service (for handling cancellation signals).
 */
export default Layer.effect(Service, Definition).pipe(
	Layer.provide(Layer.merge(ProtocolAdapterLive, CancellationLive)),
);
