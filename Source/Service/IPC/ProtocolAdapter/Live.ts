/**
 * @module Live (IPC/ProtocolAdapter)
 * @description Provides a `Layer` for the `ProtocolAdapter` service. This
 * adapter makes the gRPC communication channel compatible with VS Code's
 * `IMessagePassingProtocol`, which is required by `RPCProtocol`.
 */

import { Layer } from "effect";

import { Live as ClientLive } from "../Client.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation `Layer` for the `ProtocolAdapter` service.
 *
 * This layer builds the adapter by composing its `Definition` with the
 * `ClientLive` layer it depends on for the underlying gRPC transport.
 */
const Live = Layer.effect(Service, Definition).pipe(Layer.provide(ClientLive));

export default Live;
