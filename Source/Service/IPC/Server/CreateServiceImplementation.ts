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
	Empty,
	GenericResponse,
	type CancelOperationRequest,
	type GenericNotification,
	type GenericRequest,
	type RPCDataPayload,
} from "../Generated.js";
import { DecodeValue, EncodeValue } from "../ProtoConverter.js";

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

			const ProcessEffect = Effect.gen(function* () {
				const DecodedParameter = yield* DecodeValue(
					Request.getParams(),
				);
				const Result = yield* DispatcherService.DispatchRequest(
					Request.getMethod(),
					DecodedParameter,
				);
				const EncodedResult = yield* EncodeValue(Result);

				const Response = new GenericResponse();
				Response.setRequestid(RequestID);
				Response.setResult(EncodedResult);
				return Response;
			});

			Effect.runPromiseExit(ProcessEffect).then((exit) => {
				if (exit._tag === "Success") {
					callback(null, exit.value);
				} else {
					const RPCError: gRPC.ServiceError = {
						code: gRPC.status.INTERNAL,
						details:
							exit.cause._tag === "Fail"
								? String(exit.cause.error)
								: "Unknown Effect Failure",
						metadata: new gRPC.Metadata(),
						name: "EffectFailure",
						message: "Effect failed to complete in gRPC handler.",
					};
					callback(RPCError, null);
				}
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
			const ProcessEffect = DecodeValue(
				(Notification as any).getParams(),
			).pipe(
				Effect.flatMap((DecodedParameter) =>
					DispatcherService.DispatchNotification(
						(Notification as any).getMethod(),
						DecodedParameter,
					),
				),
			);
			Effect.runFork(ProcessEffect);
			callback(null, new Empty());
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
