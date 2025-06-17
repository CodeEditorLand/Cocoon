/*
 * File: Cocoon/Source/Service/IPC/ProtocolAdapter/Live.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:53:13 UTC
 * Dependency: ../Client.js, ./Definition.js, ./Service.js, effect
 */

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
export default Layer.effect(Service, Definition).pipe(
	Layer.provide(ClientLive),
);
