/**
 * @module ProtocolAdapter (IPC)
 * @description Provides a `Layer` for the `ProtocolAdapter` service. This
 * adapter makes the gRPC communication channel compatible with VS Code's
 * `IMessagePassingProtocol`, which is required by `RPCProtocol`.
 */

import { Layer } from "effect";

import { Client } from "./Client.js";
import { Definition } from "./ProtocolAdapter/Definition.js";
import { ProtocolAdapter as ProtocolAdapterTag } from "./ProtocolAdapter/Service.js";

export namespace ProtocolAdapter {
	export const Tag = ProtocolAdapterTag;
	export type Interface = ProtocolAdapterTag;
	/**
	 * The live implementation `Layer` for the `ProtocolAdapter` service.
	 *
	 * This layer builds the adapter by composing its `Definition` with the
	 * `LiveClient` layer it depends on for the underlying gRPC transport.
	 */
	export const Live = Layer.effect(Tag, Definition).pipe(
		Layer.provide(Client.Live),
	);
}
