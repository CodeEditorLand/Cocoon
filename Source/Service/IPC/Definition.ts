/**
 * @module Definition (IPC)
 * @description Provides the live implementation of the high-level `IPC.Service`.
 * This definition constructs the service by delegating to its underlying
 * dependencies for client communication and request dispatching.
 */

import { Effect, Ref } from "effect";

import ClientService from "./Client/Service.js";
import DispatcherService from "./Dispatcher/Service.js";
import IPCError from "./Error/IPCError.js";
import Generated from "./Generated.js";
import ProtocolAdapterService from "./ProtocolAdapter/Service.js";
import DecodeValue from "./ProtoConverter/DecodeValue.js";
import EncodeValue from "./ProtoConverter/EncodeValue.js";
import ProtoSerializationError from "./ProtoConverter/Error/ProtoSerializationError.js";
import type Service from "./Service.js";

/**
 * An `Effect` that builds the live implementation of the `IPC.Service`.
 */
export default Effect.gen(function* () {
	const Client = yield* ClientService;

	const Dispatcher = yield* DispatcherService;

	const ProtocolAdapter = yield* ProtocolAdapterService;

	const RequestIDCounter = yield* Ref.make(1);

	const SendRequest = <Res = unknown>(
		Method: string,

		Parameters: readonly unknown[],

		_TimeoutMilliseconds?: number,
	): Effect.Effect<Res, IPCError> =>
		Effect.gen(function* () {
			const RequestID = yield* Ref.getAndUpdate(
				RequestIDCounter,

				(n) => n + 1,
			);

			const EncodedParameter = yield* EncodeValue(Parameters);

			const RequestMessage = new Generated.GenericRequest();

			RequestMessage.setRequestid(RequestID);

			RequestMessage.setMethod(Method);

			RequestMessage.setParams(EncodedParameter);

			const ResponseMessage = (yield* Effect.tryPromise({
				try: () => Client.processCocoonRequest(RequestMessage),

				catch: (cause) =>
					new IPCError({
						cause,

						context: `gRPC request '${Method}' failed.`,
					}),
			})) as typeof Generated.GenericResponse.prototype;

			const DecodedResult = yield* DecodeValue(
				ResponseMessage.getResult(),
			);

			return DecodedResult as Res;
		}).pipe(
			Effect.mapError((error) => {
				if (error instanceof ProtoSerializationError) {
					return new IPCError({
						cause: error,

						context: "Proto serialization/deserialization failed",
					});
				}

				return error as IPCError;
			}),
		);

	const SendNotification = (
		Method: string,

		Parameters: readonly unknown[],
	): Effect.Effect<void, IPCError> =>
		Effect.gen(function* () {
			const EncodedParameter = yield* EncodeValue(Parameters);

			const NotificationMessage = new Generated.GenericNotification();

			NotificationMessage.setMethod(Method);

			NotificationMessage.setParams(EncodedParameter);

			yield* Effect.tryPromise({
				try: () => Client.sendCocoonNotification(NotificationMessage),

				catch: (cause) =>
					new IPCError({
						cause,

						context: `gRPC notification '${Method}' failed.`,
					}),
			});
		}).pipe(
			Effect.mapError((error) => {
				if (error instanceof ProtoSerializationError) {
					return new IPCError({
						cause: error,

						context: "Proto serialization/deserialization failed",
					});
				}

				return error as IPCError;
			}),

			Effect.asVoid,
		);

	const CreateProxy = <T extends object>(Channel: string): T => {
		return new Proxy({} as T, {
			get(_target, prop) {
				if (typeof prop === "string" && prop.startsWith("$")) {
					return (...args: any[]) => {
						const Method = `${Channel}/${prop}`;

						// The proxy needs to return a Promise to match the VS Code API.
						return Effect.runPromise(SendRequest(method, args));
					};
				}

				return (_target as any)[prop];
			},
		});
	};

	const IPCImplementation: Service["Type"] = {
		SendRequest,

		SendNotification,

		SendCancel: Dispatcher.CancelOperation,

		CreateProtocolAdapter: () => ProtocolAdapter,

		CreateProxy,

		RegisterInvokeHandler: Dispatcher.RegisterInvokeHandler,
	};

	return IPCImplementation;
});
