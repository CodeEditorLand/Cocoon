/*
 * File: Cocoon/Source/Service/IPC/Definition.ts
 * Role: Provides the live implementation of the high-level `IPC.Service`.
 * Responsibilities:
 *   - Constructs the service by composing its underlying dependencies: the gRPC
 *     Client, the RPC Dispatcher, and the ProtocolAdapter.
 */

import { Effect, Ref } from "effect";
import { Proto } from "./Generated.js";
import { IPCProblem } from "./Error.js";
import { ProtoSerializationProblem } from "./ProtoConverter/Error.js";
import { Client } from "./Client/Service.js";
import { Dispatcher } from "./Dispatcher/Service.js";
import { ProtocolAdapter } from "./ProtocolAdapter/Service.js";
import { IPC } from "./Service.js";

/**
 * An `Effect` that builds the live implementation of the `IPC.Service`.
 */
const Definition = Effect.gen(function* (Generator) {
	const IPCClient = yield* Generator(Client);
	const RPCDispatcher = yield* Generator(Dispatcher);
	const ProtocolAdapterService = yield* Generator(ProtocolAdapter);

	const RequestIDCounter = yield* Generator(Ref.make(1));

	const SendRequest = <ResponseType = unknown>(
		Method: string,
		Parameters: readonly unknown[],
		_TimeoutMilliseconds?: number,
	): Effect.Effect<ResponseType, IPCProblem> =>
		Effect.gen(function* (Generator) {
			const RequestID = yield* Generator(
				Ref.getAndUpdate(RequestIDCounter, (n) => n + 1),
			);
			const EncodedParameter = yield* Generator(EncodeValue(Parameters));
			const RequestMessage = new Proto.GenericRequest();
			RequestMessage.setRequestid(RequestID);
			RequestMessage.setMethod(Method);
			RequestMessage.setParams(EncodedParameter);

			const ResponseMessage = (yield* Generator(
				Effect.tryPromise({
					try: () => IPCClient.processCocoonRequest(RequestMessage),
					catch: (Cause) =>
						new IPCProblem({
							Cause,
							Context: `gRPC request '${Method}' failed.`,
						}),
				}),
			)) as typeof Proto.GenericResponse.prototype;

			const DecodedResult = yield* Generator(
				DecodeValue(ResponseMessage.getResult()),
			);
			return DecodedResult as ResponseType;
		}).pipe(
			Effect.mapError((Error) => {
				if (Error instanceof ProtoSerializationProblem) {
					return new IPCProblem({
						Cause: Error,
						Context: "Proto serialization/deserialization failed",
					});
				}
				return Error as IPCProblem;
			}),
		);

	const SendNotification = (
		Method: string,
		Parameters: readonly unknown[],
	): Effect.Effect<void, IPCProblem> =>
		Effect.gen(function* (Generator) {
			const EncodedParameter = yield* Generator(EncodeValue(Parameters));
			const NotificationMessage = new Proto.GenericNotification();
			NotificationMessage.setMethod(Method);
			NotificationMessage.setParams(EncodedParameter);
			yield* Generator(
				Effect.tryPromise({
					try: () =>
						IPCClient.sendCocoonNotification(NotificationMessage),
					catch: (Cause) =>
						new IPCProblem({
							Cause,
							Context: `gRPC notification '${Method}' failed.`,
						}),
				}),
			);
		}).pipe(
			Effect.mapError((Error) => {
				if (Error instanceof ProtoSerializationProblem) {
					return new IPCProblem({
						Cause: Error,
						Context: "Proto serialization/deserialization failed",
					});
				}
				return Error as IPCProblem;
			}),
			Effect.asVoid,
		);

	const CreateProxy = <T extends object>(Channel: string): T => {
		return new Proxy({} as T, {
			get(_Target, Property) {
				if (typeof Property === "string" && Property.startsWith("$")) {
					return (...Arguments: any[]) => {
						const Method = `${Channel}/${Property}`;
						return Effect.runPromise(
							SendRequest(Method, Arguments),
						);
					};
				}
				return (_Target as any)[Property];
			},
		});
	};

	const IPCImplementation: IPC = {
		SendRequest,
		SendNotification,
		SendCancel: RPCDispatcher.CancelOperation,
		CreateProtocolAdapter: () => ProtocolAdapterService,
		CreateProxy,
		RegisterInvokeHandler: RPCDispatcher.RegisterInvokeHandler,
	};

	return IPCImplementation;
});

export default Definition;
