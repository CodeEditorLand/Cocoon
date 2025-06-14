/**
 * @module Live (IPC/ProtocolAdapter)
 * @description Provides a `Layer` for the `ProtocolAdapter` service. This
 * adapter makes the gRPC communication channel compatible with VS Code's
 * `IMessagePassingProtocol`, which is required by `RPCProtocol`.
 */

import { Layer } from "effect";

import ClientLive from "../Client/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation `Layer` for the `ProtocolAdapter` service.
 *
 * This layer builds the adapter by composing its `Definition` with the
 * `LiveClient` layer it depends on for the underlying gRPC transport.
 */
export default Layer.effect(Service, Definition).pipe(
	Layer.provide(ClientLive),
);
