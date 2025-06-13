/**
 * @module Dispatcher (IPC)
 * @description Provides the Dispatcher service, which routes all incoming RPC
 * messages from the Mountain host to the appropriate handlers within Cocoon.
 */

import { Layer } from "effect";

import { Live as LiveCancellation } from "../../Cancellation/mod.js";
import { Live as LiveProtocolAdapter } from "../ProtocolAdapter/mod.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

/**
 * The live implementation Layer for the Dispatcher service.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveProtocolAdapter, LiveCancellation)),
);
