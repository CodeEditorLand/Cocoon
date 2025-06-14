/**
 * @module Dispatcher (IPC)
 * @description Provides the Dispatcher service, which routes all incoming RPC
 * messages from the Mountain host to the appropriate handlers within Cocoon.
 */

import { Layer } from "effect";

import { Cancellation } from "../Cancellation.js";
import { Definition } from "./Dispatcher/Definition.js";
import { Dispatcher as DispatcherTag } from "./Dispatcher/Service.js";
import { ProtocolAdapter } from "./ProtocolAdapter.js";

export namespace Dispatcher {
	export const Tag = DispatcherTag;
	export type Interface = DispatcherTag;

	/**
	 * The live implementation Layer for the Dispatcher service.
	 * It depends on the ProtocolAdapter (for the underlying transport) and the
	 * Cancellation service (for handling cancellation signals).
	 */
	export const Live = Layer.effect(Tag, Definition).pipe(
		Layer.provide(Layer.merge(ProtocolAdapter.Live, Cancellation.Live)),
	);
}
