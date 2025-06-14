/**
 * @module Definition (IPC)
 * @description Provides the live implementation of the high-level `IPC.Service`.
 * This definition constructs the service by delegating to its underlying
 * dependencies for client communication and request dispatching.
 */

import { Effect, Ref } from "effect";

import ClientService from "./Client/Service.js";
import DispatcherService from "./Dispatcher/Service.js";
import { IPCError } from "./Error.js";
import Generated from "./Generated.js";
import ProtocolAdapterService from "./ProtocolAdapter/Service.js";
import {
	DecodeValue,
	EncodeValue,
	ProtoSerializationError,
} from "./ProtoConverter.js";
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
			RequestMessage.setParams(EncodedParameter as any);

			const ResponseMessage = (yield* Effect.tryPromise({
				try: () => Client.processCocoonRequest(RequestMessage),
				catch: (Cause) =>
					new IPCError({
						cause: Cause,
						context: `gRPC request '${Method}' failed.`,
					}),
			})) as typeof Generated.GenericResponse.prototype;

			const DecodedResult = yield* DecodeValue(
				ResponseMessage.getResult(),
			);
			return DecodedResult as Res;
		}).pipe(
			Effect.mapError((Error) => {
				if (Error instanceof ProtoSerializationError) {
					return new IPCError({
						cause: Error,
						context: "Proto serialization/deserialization failed",
					});
				}
				return Error;
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
			NotificationMessage.setParams(EncodedParameter as any);

			yield* Effect.tryPromise({
				try: () => Client.sendCocoonNotification(NotificationMessage),
				catch: (Cause) =>
					new IPCError({
						cause: Cause,
						context: `gRPC notification '${Method}' failed.`,
					}),
			});
		}).pipe(
			Effect.mapError((Error) => {
				if (Error instanceof ProtoSerializationError) {
					return new IPCError({
						cause: Error,
						context: "Proto serialization/deserialization failed",
					});
				}
				return Error;
			}),
			Effect.asVoid,
		);

	const IPCImplementation: Service = {
		SendRequest,
		SendNotification,
		SendCancel: Dispatcher.CancelOperation,
		CreateProtocolAdapter: () => ProtocolAdapter,
		RegisterInvokeHandler: Dispatcher.RegisterInvokeHandler,
	};

	return IPCImplementation;
});
