/**
 * @module CreateServiceImplementation
 * @description Creates the implementation object for the `Cocoon` gRPC service.
 * This object contains the handlers for all RPC methods callable by `Mountain`.
 */

import * as gRPC from "@grpc/grpc-js";
import type { UntypedServiceImplementation } from "@grpc/grpc-js";
import { Effect } from "effect";

import { type Interface as Dispatcher } from "../Dispatcher/Service.js";
import {
	CancelOperationRequest,
	Empty,
	GenericNotification,
	GenericRequest,
	GenericResponse,
	RPCDataPayload,
} from "../Generated.js";
import { DecodeValue, EncodeValue } from "../ProtoConverter.js";

/**
 * Builds the object containing all the RPC method handlers. These handlers
 * are the entry point for all calls coming *from* `Mountain` *to* `Cocoon`.
 *
 * Each handler decodes the incoming gRPC message, dispatches the request to the
 * appropriate service via the `Dispatcher`, encodes the result, and sends it
 * back to `Mountain`.
 *
 * @param DispatcherService - The dispatcher service responsible for routing
 * incoming requests to the correct `Effect` handlers.
 * @returns The gRPC service implementation object.
 */
export const CreateServiceImplementation = (
	DispatcherService: Dispatcher,
): UntypedServiceImplementation => ({
	/**
	 * Handles generic request/response calls from `Mountain`.
	 */
	processMountainRequest: (call, callback) => {
		const Request = call.request as GenericRequest;
		const RequestId = Request.getRequestid();

		const ProcessEffect = Effect.gen(function* (_) {
			const DecodedParameter = yield* _(DecodeValue(Request.getParams()));
			const Result = yield* _(
				DispatcherService.DispatchRequest(
					Request.getMethod(),
					DecodedParameter,
				),
			);
			const EncodedResult = yield* _(EncodeValue(Result));

			const Response = new GenericResponse();
			Response.setRequestid(RequestId);
			Response.setResult(EncodedResult);
			return Response;
		});

		Effect.runCallback(ProcessEffect, (Exit) => {
			if (Exit.isSuccess()) {
				callback(null, Exit.value);
			} else {
				// TODO: Serialize the failure cause into a meaningful gRPC error.
				const RPCError = {
					code: gRPC.status.INTERNAL,
					message: "Effect failed",
				};
				callback(RPCError, null);
			}
		});
	},

	/**
	 * Handles fire-and-forget notifications from `Mountain`.
	 */
	sendMountainNotification: (call, callback) => {
		const Notification = call.request as GenericNotification;

		const ProcessEffect = DecodeValue(Notification.getParams()).pipe(
			Effect.flatMap((DecodedParameter) =>
				DispatcherService.DispatchNotification(
					Notification.getMethod(),
					DecodedParameter,
				),
			),
			Effect.as(new Empty()),
		);

		Effect.runCallback(ProcessEffect, () => callback(null, new Empty()));
	},

	/**
	 * Handles incoming raw binary data for the `RPCProtocol` adapter.
	 */
	sendRPCDataToCocoon: (call, callback) => {
		const Payload = call.request as RPCDataPayload;
		const ProcessEffect = DispatcherService.ProcessIncomingData(
			Payload.getBuffer_asU8(),
		);
		Effect.runCallback(ProcessEffect, () => callback(null, new Empty()));
	},

	/**
	 * Handles cancellation requests from `Mountain`.
	 */
	cancelCocoonOperation: (call, callback) => {
		const Request = call.request as CancelOperationRequest;
		const ProcessEffect = DispatcherService.CancelOperation(
			Request.getRequestidtocancel(),
		);
		Effect.runCallback(ProcessEffect, () => callback(null, new Empty()));
	},
});
