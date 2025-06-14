/**
 * @module Live (IPC/Dispatcher)
 * @description Provides the live implementation Layer for the Dispatcher service.
 */

import { Layer } from "effect";

import CancellationLive from "../../Cancellation/Live.js";
import ProtocolAdapterLive from "../ProtocolAdapter/Live.js";
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
