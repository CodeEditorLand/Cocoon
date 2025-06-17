/*
 * File: Cocoon/Source/Service/IPC/ProtocolAdapter/Service.ts
 * Responsibility: Implements the IPC protocol adapter service for the Cocoon sidecar, bridging VS Code's RPCProtocol with the Vine transport layer to enable extension host communication via Mountain's gRPC-based IPC.
 * Modified: 2025-06-17 10:32:30 UTC
 * Dependency: effect, vs/base/parts/ipc/common/ipc.js
 * Export: ProtocolAdapterService
 */

/**
 * @module Service (IPC/ProtocolAdapter)
 * @description Defines the service interface and `Context.Tag` for the
 * `ProtocolAdapter`. This adapter allows VS Code's `RPCProtocol` to use
 * our gRPC implementation as its underlying transport layer.
 */

import { Context, type Effect } from "effect";
import type { IMessagePassingProtocol } from "vs/base/parts/ipc/common/ipc.js";

export default class ProtocolAdapterService extends Context.Tag(
	"IPC/ProtocolAdapter",
)<
	ProtocolAdapterService,
	IMessagePassingProtocol & {
		/**
		 * An `Effect` that processes a raw binary buffer received from the host and
		 * fires the `onMessage` event for the `RPCProtocol` to consume.
		 * @param Data The raw `Uint8Array` received from `Mountain`.
		 */
		readonly ProcessIncomingData: (
			Data: Uint8Array,
		) => Effect.Effect<void, never>;
	}
>() {}
