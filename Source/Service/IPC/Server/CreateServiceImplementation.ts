/*
 * File: Cocoon/Source/Service/IPC/Server/CreateServiceImplementation.ts
 *
 * This file creates the implementation object for the `Cocoon` gRPC service.
 * This object contains the handlers for all RPC methods callable by `Mountain`.
 */

import * as GRPC from "@grpc/grpc-js";
import type { UntypedServiceImplementation } from "@grpc/grpc-js";
import { Effect } from "effect";

import type DispatcherService from "../Dispatcher/Service.js";
import Generated from "../Generated.js";
import DecodeValue from "../ProtoConverter/DecodeValue.js";
import EncodeValue from "../ProtoConverter/EncodeValue.js";

const CreateServiceImplementation = (
	Dispatcher: DispatcherService,
): UntypedServiceImplementation => {
	return {
		/**
		 * Handles generic request/response calls from `Mountain`.
		 */
		processMountainRequest: (
			Call: GRPC.ServerUnaryCall<
				typeof Generated.GenericRequest.prototype,
				typeof Generated.GenericResponse.prototype
			>,
			Callback: GRPC.sendUnaryData<
				typeof Generated.GenericResponse.prototype
			>,
		) => {
			const Request = Call.request;
			const RequestID = Request.getRequestid();
			const ProcessEffect = Effect.gen(function* () {
				const DecodedParameter = yield* DecodeValue(
					Request.getParams(),
				);
				const Result = yield* Dispatcher.DispatchRequest(
					Request.getMethod(),
					Array.isArray(DecodedParameter) ? DecodedParameter : [],
				);
				const EncodedResult = yield* EncodeValue(Result);
				const Response = new Generated.GenericResponse();
				Response.setRequestid(RequestID);
				Response.setResult(EncodedResult);
				return Response;
			}).pipe(
				Effect.catchAll((err) =>
					Effect.fail(
						new Error("gRPC handler effect failed", { cause: err }),
					),
				),
			);
			Effect.runPromiseExit(ProcessEffect).then((Exit) => {
				if (Exit._tag === "Success") {
					Callback(null, Exit.value);
				} else {
					const RPCError: GRPC.ServiceError = {
						code: GRPC.status.INTERNAL,
						details:
							Exit.cause._tag === "Fail"
								? String(Exit.cause.error)
								: "Unknown Effect Failure",
						metadata: new GRPC.Metadata(),
						name: "EffectFailure",
						message: "Effect failed to complete in gRPC handler.",
					};
					Callback(RPCError, null);
				}
			});
		},
		/**
		 * Handles fire-and-forget notifications from `Mountain`.
		 */
		sendMountainNotification: (
			Call: GRPC.ServerUnaryCall<
				typeof Generated.GenericNotification.prototype,
				typeof Generated.Empty.prototype
			>,
			Callback: GRPC.sendUnaryData<typeof Generated.Empty.prototype>,
		) => {
			const Notification = Call.request;
			const ProcessEffect = DecodeValue(Notification.getParams()).pipe(
				Effect.flatMap((DecodedParameter) =>
					Dispatcher.DispatchNotification(
						Notification.getMethod(),
						Array.isArray(DecodedParameter) ? DecodedParameter : [],
					),
				),
			);
			Effect.runFork(ProcessEffect);
			Callback(null, new Generated.Empty());
		},
		/**
		 * Handles incoming raw binary data for the `RPCProtocol` adapter.
		 */
		sendRPCDataToCocoon: (
			Call: GRPC.ServerUnaryCall<
				typeof Generated.RPCDataPayload.prototype,
				typeof Generated.Empty.prototype
			>,
			Callback: GRPC.sendUnaryData<typeof Generated.Empty.prototype>,
		) => {
			const Payload = Call.request;
			const ProcessEffect = Dispatcher.ProcessIncomingData(
				Payload.getBuffer_asU8(),
			);
			Effect.runFork(ProcessEffect);
			Callback(null, new Generated.Empty());
		},
		/**
		 * Handles cancellation requests from `Mountain`.
		 */
		cancelCocoonOperation: (
			Call: GRPC.ServerUnaryCall<
				typeof Generated.CancelOperationRequest.prototype,
				typeof Generated.Empty.prototype
			>,
			Callback: GRPC.sendUnaryData<typeof Generated.Empty.prototype>,
		) => {
			const Request = Call.request;
			const ProcessEffect = Dispatcher.CancelOperation(
				Request.getRequestid(),
			);
			Effect.runFork(ProcessEffect);
			Callback(null, new Generated.Empty());
		},
	};
};

export default CreateServiceImplementation;
