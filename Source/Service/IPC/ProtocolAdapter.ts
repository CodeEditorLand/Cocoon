/**
 * @module ProtocolAdapter (IPC)
 * @description Provides a `Layer` for the `ProtocolAdapter` service. This
 * adapter makes the gRPC communication channel compatible with VS Code's
 * `IMessagePassingProtocol`, which is required by `RPCProtocol`.
 */

import { Layer } from "effect";

import { Live as LiveClient } from "./Client.js";
import { Definition } from "./ProtocolAdapter/Definition.js";
import { Tag, type Interface } from "./ProtocolAdapter/Service.js";

// --- Public API Exports ---
export { Tag, type Interface };

// --- Live Implementation ---

/**
 * The live implementation `Layer` for the `ProtocolAdapter` service.
 * It builds the adapter by composing its `Definition` with the
 * `LiveClient` layer it depends on for the underlying gRPC transport.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(LiveClient),
);
