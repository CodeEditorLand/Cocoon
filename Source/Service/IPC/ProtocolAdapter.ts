/**
 * @module ProtocolAdapter (IPC)
 * @description Provides a `Layer` for the `ProtocolAdapter` service. This
 * adapter makes the gRPC communication channel compatible with VS Code's
 * `IMessagePassingProtocol`, which is required by `RPCProtocol`.
 */

import { Layer } from "effect";

import { Live as LiveClient } from "./Client.js";
import { Definition } from "./ProtocolAdapter/Definition.js";
import { Tag } from "./ProtocolAdapter/Service.js";

/**
 * The live implementation `Layer` for the `ProtocolAdapter` service.
 *
 * This layer builds the adapter by composing its `Definition` with the
 * `LiveClient` layer it depends on for the underlying gRPC transport.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(LiveClient),
);
