

/**
 * @module Definition (IPC/ProtocolAdapter)
 * @description The live implementation of the `ProtocolAdapter` service.
 * This adapter is responsible for handling raw binary data communication for
 * VS Code's core RPC mechanism.
 */

import { Effect } from "effect";
import { VSBuffer } from "vs/base/common/buffer.js";
import { Emitter } from "vs/base/common/event.js";

import ClientService from "../Client/Service.js";
import IPCError from "../Error/IPCError.js";
import Generated from "../Generated.js";
import type Service from "./Service.js";

/**
 * An `Effect` that builds the live implementation of the `ProtocolAdapter`
 * service.
 *
 * It encapsulates the event emitters for incoming messages and the `send`
 * logic for outgoing messages, delegating the actual transport to the low-level
 * gRPC client.
 */
export default Effect.gen(function* () {
	const Client = yield* ClientService;

	// Emitters are created within the service's scope.
	const OnMessageEmitter = new Emitter<VSBuffer>();

	/**
	 * An `Effect` that sends a raw buffer to `Mountain` via gRPC.
	 */
	const Send = (Buffer: VSBuffer) =>
		Effect.tryPromise({
			try: () => {
				const Payload = new Generated.RPCDataPayload();
				Payload.setBuffer(Buffer.buffer);
				// The gRPC method is assumed to be available on the client service.
				return Client.sendRPCDataToMountain(Payload);
			},
			catch: (cause) =>
				new IPCError({
					cause,
					context: "sendRPCDataToMountain failed",
				}),
		}).pipe(
			Effect.catchAll((error) =>
				Effect.logError("Failed to send RPC data via gRPC", error),
			),
			Effect.asVoid,
		);

	const ProtocolAdapterImplementation: Service["Type"] = {
		/**
		 * The `send` method must be synchronous according to the VS Code API.
		 * Therefore, we fork the `Send` Effect to run in the background without
		 * blocking the caller.
		 */
		send: (Buffer) => {
			Effect.runFork(Send(Buffer));
		},

		onMessage: OnMessageEmitter.event,

		/**
		 * An `Effect` that processes incoming raw data from `Mountain` by
		 * firing the `onMessage` event.
		 */
		ProcessIncomingData: (Data) =>
			Effect.sync(() => {
				OnMessageEmitter.fire(VSBuffer.wrap(Data));
			}),
	};

	return ProtocolAdapterImplementation;
});
