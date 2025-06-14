/**
 * @module Definition (IPC)
 * @description Provides the live implementation of the high-level `IPC.Service`.
 * This definition constructs the service by delegating to its underlying
 * dependencies for client communication and request dispatching.
 */

import { Context, Effect, Ref } from "effect";

import ClientService from "./Client/Service.js";
import DispatcherService from "./Dispatcher/Service.js";
import IPCError from "./Error/IPCError.js";
import {
	GenericNotification,
	GenericRequest,
	GenericResponse,
} from "./Generated.js";
import ProtocolAdapterService from "./ProtocolAdapter/Service.js";
import DecodeValue from "./ProtoConverter/DecodeValue.js";
import EncodeValue from "./ProtoConverter/EncodeValue.js";
import ProtoSerializationError from "./ProtoConverter/Error/ProtoSerializationError.js";

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
				try: () => Client.processCocoonRequest(RequestMessage),
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
				return error;
			}),
			Effect.asVoid,
		);

	const ServiceImplementation: Context.Tag.Service<any> = {
		SendRequest,
		SendNotification,
		SendCancel: Dispatcher.CancelOperation,
		CreateProtocolAdapter: () => ProtocolAdapter,
		RegisterInvokeHandler: Dispatcher.RegisterInvokeHandler,
	};

	return ServiceImplementation;
});
