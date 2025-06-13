/**
 * @module Dispatcher (IPC)
 * @description Provides the Dispatcher service, which routes all incoming RPC
 * messages from the Mountain host to the appropriate handlers within Cocoon.
 */

import { Layer } from "effect";

import { Live as LiveCancellation } from "../Cancellation.js";
import { Definition } from "./Dispatcher/Definition.js";
import { Tag } from "./Dispatcher/Service.js";
import { Live as LiveProtocolAdapter } from "./ProtocolAdapter.js";

/**
 * The live implementation Layer for the Dispatcher service.
 * It depends on the ProtocolAdapter (for the underlying transport) and the
 * Cancellation service (for handling cancellation signals).
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveProtocolAdapter, LiveCancellation)),
);
