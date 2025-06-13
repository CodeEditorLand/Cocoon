/**
 * @module Definition
 * @description Provides the live implementation of the high-level `IPC.Service`.
 * This definition constructs the service by delegating to its underlying
 * dependencies for client communication and request dispatching.
 */

import { Effect, Ref } from "effect";

import { GenericNotification, GenericRequest } from "../Generated.js";
import {
	Tag as ClientTag,
	type Service as ClientService,
} from "./Client/Service.js";
import {
	Tag as DispatcherTag,
	type Interface as DispatcherInterface,
} from "./Dispatcher/Service.js";
import { IPCError } from "./Error.js";
import {
	Tag as AdapterTag,
	type Interface as AdapterInterface,
} from "./ProtocolAdapter/Service.js";
import { DecodeValue, EncodeValue } from "./ProtoConverter.js";
import type { Interface } from "./Service.js";

/**
 * An `Effect` that builds the live implementation of the `IPC.Service`.
 *
 * It acts as a facade, delegating its methods to the appropriate sub-services
 * (`Client`, `Dispatcher`, `ProtocolAdapter`) that contain the detailed logic.
 */
export const Definition = Effect.gen(function* (_) {
	const Client = yield* _(ClientTag);
	const Dispatcher = yield* _(DispatcherTag);
	const Adapter = yield* _(AdapterTag);
	const RequestIdCounter = yield* _(Ref.make(1));

	/**
	 * Sends a request to `Mountain` and awaits a response.
	 */
	const SendRequestEffect = <Res = unknown, Err = IPCError>(
		Method: string,
		Parameters: unknown,
		_TimeoutMilliseconds?: number,
	): Effect.Effect<Res, Err> =>
		Effect.gen(function* (_) {
			const RequestId = yield* _(
				Ref.getAndUpdate(RequestIdCounter, (n) => n + 1),
			);
			const EncodedParameter = yield* _(EncodeValue(Parameters));

			const RequestMessage = new GenericRequest();
			RequestMessage.setRequestid(RequestId);
			RequestMessage.setMethod(Method);
			RequestMessage.setParams(EncodedParameter);

			const ResponseMessage = yield* _(
				Effect.tryPromise({
					try: () => Client.processCocoonRequest(RequestMessage),
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
		}).pipe(Effect.mapError((e) => e as Err)); // Ensure error type matches

	/**
	 * Sends a fire-and-forget notification to `Mountain`.
	 */
	const SendNotificationEffect = <Err = IPCError>(
		Method: string,
		Parameters: unknown,
	): Effect.Effect<void, Err> =>
		Effect.gen(function* (_) {
			const EncodedParameter = yield* _(EncodeValue(Parameters));

			const NotificationMessage = new GenericNotification();
			NotificationMessage.setMethod(Method);
			NotificationMessage.setParams(EncodedParameter);

			yield* _(
				Effect.tryPromise({
					try: () =>
						Client.sendCocoonNotification(NotificationMessage),
					catch: (Cause) =>
						new IPCError({
							cause: Cause,
							context: `gRPC notification '${Method}' failed.`,
						}),
				}),
			);
		}).pipe(
			Effect.asUnit,
			Effect.mapError((e) => e as Err),
		);

	const ServiceImplementation: Interface = {
		SendRequest: SendRequestEffect,
		SendNotification: SendNotificationEffect,
		// Delegate these methods directly to the specialized sub-services.
		SendCancel: Dispatcher.CancelOperation,
		CreateProtocolAdapter: () => Adapter,
		RegisterInvokeHandler: Dispatcher.RegisterInvokeHandler,
	};

	return ServiceImplementation;
});
