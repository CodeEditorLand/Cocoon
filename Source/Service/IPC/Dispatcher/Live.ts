/*
 * File: Cocoon/Source/Service/IPC/Dispatcher/Live.ts
 * Responsibility: Provides the live implementation Layer for the Dispatcher service, which routes all incoming RPC messages from the Mountain host to appropriate handlers within Cocoon.
 * Modified: 2025-06-17 11:20:29 UTC
 * Dependency: ../../Cancellation/Service.js, ../ProtocolAdapter/Service.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (IPC/Dispatcher)
 * @description Provides the live implementation Layer for the Dispatcher service.
 */

import { Layer } from "effect";

import type CancellationService from "../../Cancellation/Service.js";
import type ProtocolAdapterService from "../ProtocolAdapter/Service.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Dispatcher service.
 * It correctly declares its dependencies on `ProtocolAdapterService` and `CancellationService`.
 */
const Live: Layer.Layer<
	Service,
	never,
	ProtocolAdapterService | CancellationService
> = Layer.effect(Service, Definition);

export default Live;
