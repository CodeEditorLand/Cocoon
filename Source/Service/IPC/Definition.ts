/**
 * @module Definition (IPC)
 * @description Provides the live implementation of the high-level `IPC.Service`.
 * This definition constructs the service by delegating to its underlying
 * dependencies for client communication and request dispatching.
 */

import { Effect, Ref } from "effect";

import { Client } from "./Client/Service.js";
import { Dispatcher } from "./Dispatcher/Service.js";
import { IPCError, ProtoSerializationError } from "./Error.js";
import {
	GenericNotification,
	GenericRequest,
	GenericResponse,
} from "./Generated.js";
import { ProtocolAdapter } from "./ProtocolAdapter/Service.js";
import { DecodeValue, EncodeValue } from "./ProtoConverter.js";
import type { Interface } from "./Service.js";

/**
 * An `Effect` that builds the live implementation of the `IPC.Service`.
 */
export const Definition = Effect.gen(function* () {
	const ClientService = yield* Client.Tag;
	const DispatcherService = yield* Dispatcher.Tag;
	const AdapterService = yield* ProtocolAdapter.Tag;
	const RequestIDCounter = yield* Ref.make(1);

	const SendRequest = <Res = unknown>(
		Method: string,
		Parameters: unknown,
		_TimeoutMilliseconds?: number,
	): Effect.Effect<Res, IPCError> =>
		Effect.gen(function* () {
			const RequestID = yield* Ref.getAndUpdate(
				RequestIDCounter,
				(n) => n + 1,
			);
			const EncodedParameter = yield* EncodeValue(Parameters);

			const RequestMessage = new GenericRequest();
			RequestMessage.setRequestid(RequestID);
			RequestMessage.setMethod(Method);
			RequestMessage.setParams(EncodedParameter);

			const ResponseMessage = (yield* Effect.tryPromise({
				try: () => ClientService.processCocoonRequest(RequestMessage),
				catch: (cause) =>
					new IPCError({
						cause,
						context: `gRPC request '${Method}' failed.`,
					}),
			})) as GenericResponse;

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
				return error;
			}),
		);

	const SendNotification = (
		Method: string,
		Parameters: unknown,
	): Effect.Effect<void, IPCError> =>
		Effect.gen(function* () {
			const EncodedParameter = yield* EncodeValue(Parameters);

			const NotificationMessage = new GenericNotification();
			NotificationMessage.setMethod(Method);
			NotificationMessage.setParams(EncodedParameter);

			yield* Effect.tryPromise({
				try: () =>
					ClientService.sendCocoonNotification(NotificationMessage),
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
				return error;
			}),
			Effect.asVoid,
		);

	const ServiceImplementation: Interface = {
		SendRequest,
		SendNotification,
		SendCancel: DispatcherService.CancelOperation,
		CreateProtocolAdapter: () => AdapterService,
		RegisterInvokeHandler: DispatcherService.RegisterInvokeHandler,
	};

	return ServiceImplementation;
});
