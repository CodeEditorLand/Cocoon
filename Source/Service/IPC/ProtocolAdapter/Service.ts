/*
 * File: Cocoon/Source/Service/IPC/ProtocolAdapter/Service.ts
 * Role: Defines the ProtocolAdapter service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Adapt VS Code's `IMessagePassingProtocol` to use our gRPC implementation as its transport layer.
 */

import { Effect } from "effect";
import { VSBuffer } from "vs/base/common/buffer.js";
import { Emitter } from "vs/base/common/event.js";
import type { IMessagePassingProtocol } from "vs/base/parts/ipc/common/ipc.js";

import { Client } from "../Client/Service.js";
import { IPCProblem } from "../Error/IPCError.js";
import Generated from "../Generated.js";

export interface ProtocolAdapter extends IMessagePassingProtocol {
	readonly ProcessIncomingData: (
		Data: Uint8Array,
	) => Effect.Effect<void, never>;
}

export class ProtocolAdapter extends Effect.Service<ProtocolAdapter>()(
	"IPC/ProtocolAdapter",
	{
		effect: Effect.gen(function* (Generator) {
			const GRPCClient = yield* Generator(Client);
			const OnMessageEmitter = new Emitter<VSBuffer>();

			const Send = (Buffer: VSBuffer) =>
				Effect.tryPromise({
					try: () => {
						const Payload = new Generated.RPCDataPayload();
						Payload.setBuffer(Buffer.buffer);
						return GRPCClient.sendRPCDataToMountain(Payload);
					},
					catch: (cause) =>
						new IPCProblem({
							cause,
							context: "sendRPCDataToMountain failed",
						}),
				}).pipe(
					Effect.catchAll((Error) =>
						Effect.logError(
							"Failed to send RPC data via gRPC",
							Error,
						),
					),
					Effect.asVoid,
				);

			const ServiceImplementation: ProtocolAdapter = {
				send: (Buffer) => Effect.runFork(Send(Buffer)),
				onMessage: OnMessageEmitter.event,
				ProcessIncomingData: (Data) =>
					Effect.sync(() =>
						OnMessageEmitter.fire(VSBuffer.wrap(Data)),
					),
			};

			return ServiceImplementation;
		}),
	},
) {}
