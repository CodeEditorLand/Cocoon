/**
 * @module Definition (IPC)
 * @description Provides the live implementation of the high-level `IPC.Service`.
 * This definition constructs the service by delegating to its underlying
 * dependencies for client communication and request dispatching.
 */

import { Effect, Ref } from "effect";

import { Client } from "./Client/Service.js";
import { Dispatcher } from "./Dispatcher/Service.js";
import { IPCError } from "./Error.js";
import { GenericNotification, GenericRequest } from "./Generated.js";
import { ProtocolAdapter } from "./ProtocolAdapter/Service.js";
import { DecodeValue, EncodeValue } from "./ProtoConverter.js";
import type { Interface } from "./Service.js";

/**
 * An `Effect` that builds the live implementation of the `IPC.Service`.
 *
 * It acts as a facade, delegating its methods to the appropriate sub-services
 * (`Client`, `Dispatcher`, `ProtocolAdapter`) that contain the detailed logic.
 */
export const Definition = Effect.gen(function* (_) {
	const ClientService = yield* _(Client.Tag);
	const DispatcherService = yield* _(Dispatcher.Tag);
	const AdapterService = yield* _(ProtocolAdapter.Tag);
	const RequestIDCounter = yield* _(Ref.make(1));

	/**
	 * Sends a request to `Mountain` and awaits a response.
	 */
	const SendRequest = <Res = unknown>(
		Method: string,
		Parameters: unknown,
		_TimeoutMilliseconds?: number,
	): Effect.Effect<Res, IPCError> =>
		Effect.gen(function* (_) {
			const RequestID = yield* _(
				Ref.getAndUpdate(RequestIDCounter, (n) => n + 1),
			);
			const EncodedParameter = yield* _(EncodeValue(Parameters));

			const RequestMessage = new GenericRequest();
			RequestMessage.setRequestid(RequestID);
			RequestMessage.setMethod(Method);
			RequestMessage.setParams(EncodedParameter);

			const ResponseMessage = yield* _(
				Effect.tryPromise({
					try: () =>
						ClientService.processCocoonRequest(RequestMessage),
					catch: (Cause) =>
						new IPCError({
							cause: Cause,
							context: `gRPC request '${Method}' failed.`,
						}),
				}),
			);

			const DecodedResult = yield* _(
				DecodeValue(ResponseMessage.getResult()),
			);
			return DecodedResult as Res;
		});

	/**
	 * Sends a fire-and-forget notification to `Mountain`.
	 */
	const SendNotification = (
		Method: string,
		Parameters: unknown,
	): Effect.Effect<void, IPCError> =>
		Effect.gen(function* (_) {
			const EncodedParameter = yield* _(EncodeValue(Parameters));

			const NotificationMessage = new GenericNotification();
			NotificationMessage.setMethod(Method);
			NotificationMessage.setParams(EncodedParameter);

			yield* _(
				Effect.tryPromise({
					try: () =>
						ClientService.sendCocoonNotification(
							NotificationMessage,
						),
					catch: (Cause) =>
						new IPCError({
							cause: Cause,
							context: `gRPC notification '${Method}' failed.`,
						}),
				}),
			);
		}).pipe(Effect.asUnit);

	const ServiceImplementation: Interface = {
		SendRequest,
		SendNotification,
		// Delegate these methods directly to the specialized sub-services.
		SendCancel: DispatcherService.CancelOperation,
		CreateProtocolAdapter: () => AdapterService,
		RegisterInvokeHandler: DispatcherService.RegisterInvokeHandler,
	};

	return ServiceImplementation;
});
