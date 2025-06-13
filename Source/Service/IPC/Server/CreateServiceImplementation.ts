/**
 * @module CreateServiceImplementation (IPC/Server)
 * @description Creates the implementation object for the `Cocoon` gRPC service.
 * This object contains the handlers for all RPC methods callable by `Mountain`.
 */

import * as gRPC from "@grpc/grpc-js";
import type { UntypedServiceImplementation } from "@grpc/grpc-js";
import { Effect } from "effect";

import type { Dispatcher } from "../Dispatcher/Service.js";
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
 * @param DispatcherService The dispatcher service responsible for routing
 * incoming requests to the correct `Effect` handlers.
 * @returns The gRPC service implementation object.
 */
export function CreateServiceImplementation(
	DispatcherService: Dispatcher.Interface,
): UntypedServiceImplementation {
	return {
		/**
		 * Handles generic request/response calls from `Mountain`.
		 */
		processMountainRequest: (
			call: gRPC.ServerUnaryCall<GenericRequest, GenericResponse>,
			callback: gRPC.sendUnaryData<GenericResponse>,
		) => {
			const Request = call.request;
			const RequestID = Request.getRequestid();

			const ProcessEffect = Effect.gen(function* (_) {
				const DecodedParameter = yield* _(
					DecodeValue(Request.getParams()),
				);
				const Result = yield* _(
					DispatcherService.DispatchRequest(
						Request.getMethod(),
						DecodedParameter,
					),
				);
				const EncodedResult = yield* _(EncodeValue(Result));

				const Response = new GenericResponse();
				Response.setRequestid(RequestID);
				Response.setResult(EncodedResult);
				return Response;
			});

			Effect.runCallback(ProcessEffect, {
				onSuccess: (Response) => callback(null, Response),
				onFailure: (cause) => {
					// TODO: Serialize the failure cause into a meaningful gRPC error.
					const RPCError: gRPC.ServiceError = {
						code: gRPC.status.INTERNAL,
						details:
							cause._tag === "Fail"
								? String(cause.error)
								: "Unknown Effect Failure",
						metadata: new gRPC.Metadata(),
						name: "EffectFailure",
						message: "Effect failed to complete in gRPC handler.",
					};
					callback(RPCError, null);
				},
			});
		},

		/**
		 * Handles fire-and-forget notifications from `Mountain`.
		 */
		sendMountainNotification: (
			call: gRPC.ServerUnaryCall<GenericNotification, Empty>,
			callback: gRPC.sendUnaryData<Empty>,
		) => {
			const Notification = call.request;

			const ProcessEffect = DecodeValue(Notification.getParams()).pipe(
				Effect.flatMap((DecodedParameter) =>
					DispatcherService.DispatchNotification(
						Notification.getMethod(),
						DecodedParameter,
					),
				),
			);

			Effect.runFork(ProcessEffect); // Run in background
			callback(null, new Empty()); // Acknowledge immediately
		},

		/**
		 * Handles incoming raw binary data for the `RPCProtocol` adapter.
		 */
		sendRPCDataToCocoon: (
			call: gRPC.ServerUnaryCall<RPCDataPayload, Empty>,
			callback: gRPC.sendUnaryData<Empty>,
		) => {
			const Payload = call.request;
			const ProcessEffect = DispatcherService.ProcessIncomingData(
				Payload.getBuffer_asU8(),
			);
			Effect.runFork(ProcessEffect);
			callback(null, new Empty());
		},

		/**
		 * Handles cancellation requests from `Mountain`.
		 */
		cancelCocoonOperation: (
			call: gRPC.ServerUnaryCall<CancelOperationRequest, Empty>,
			callback: gRPC.sendUnaryData<Empty>,
		) => {
			const Request = call.request;
			const ProcessEffect = DispatcherService.CancelOperation(
				Request.getRequestidtocancel(),
			);
			Effect.runFork(ProcessEffect);
			callback(null, new Empty());
		},
	};
}
