/*
 * File: Cocoon/Source/Service/IPC/Server/Service.ts
 * Role: Defines the gRPC Server service type and provides its default "live" implementation.
 * Responsibilities:
 *   - Manages the lifecycle of the Cocoon gRPC server instance.
 */

import * as GRPC from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { Effect } from "effect";
import * as Path from "node:path";
import type { UntypedServiceImplementation } from "@grpc/grpc-js";

import { Configuration as IPCConfiguration } from "../Configuration.js";
import { Dispatcher } from "../Dispatcher/Service.js";
import { GPCConnectionError } from "../Error/gRPCConnectionError.js";
import Generated from "../Generated.js";

// --- Internal Helper Logic ---
const CreateServiceImplementation = (
	DispatcherService: Dispatcher,
): UntypedServiceImplementation => ({
	processMountainRequest: (Call, Callback) => {
		const Request =
			Call.request as typeof Generated.GenericRequest.prototype;
		const ProcessEffect = Effect.gen(function* () {
			const DecodedParameter = yield* DecodeValue(Request.getParams());
			const Result = yield* DispatcherService.DispatchRequest(
				Request.getMethod(),
				Array.isArray(DecodedParameter) ? DecodedParameter : [],
			);
			const EncodedResult = yield* EncodeValue(Result);
			const Response = new Generated.GenericResponse();
			Response.setRequestid(Request.getRequestid());
			Response.setResult(EncodedResult);
			return Response;
		}).pipe(
			Effect.catchAll((err) =>
				Effect.fail(
					new Error("gRPC handler effect failed", { Cause: err }),
				),
			),
		);
		Effect.runPromiseExit(ProcessEffect).then((Exit) => {
			if (Exit._tag === "Success") Callback(null, Exit.value);
			else {
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
	sendMountainNotification: (Call, Callback) => {
		/* ... */
	},
	sendRPCDataToCocoon: (Call, Callback) => {
		/* ... */
	},
	cancelCocoonOperation: (Call, Callback) => {
		/* ... */
	},
});

const ReleaseServer = (Server: GRPC.Server) =>
	Effect.tryPromise({
		try: () =>
			new Promise<void>((Resolve, Reject) =>
				Server.tryShutdown((Error) =>
					Error ? Reject(Error) : Resolve(),
				),
			),
		catch: (Cause) =>
			new GPCConnectionError({
				Cause,
				Context: "ServerShutdownFailed" as any,
			}), // Assuming you add this Context
	}).pipe(
		Effect.tap(() => Effect.logInfo("Cocoon gRPC server shut down.")),
		Effect.orDie,
	);

// --- Service Definition ---
export class Server extends Effect.Service<gRPC.Server>()("IPC/Server", {
	scoped: Effect.acquireRelease(
		Effect.gen(function* (Generator) {
			const Config = yield* Generator(IPCConfiguration);
			const DispatcherService = yield* Generator(Dispatcher);
			const ProtoPath = Path.join(process.cwd(), "proto/vine.ipc.proto");
			const Definition = yield* Generator(
				Effect.tryPromise({
					try: () =>
						protoLoader.load(ProtoPath, {
							/* options */
						}),
					catch: (Cause) =>
						new GPCConnectionError({
							Cause,
							Context: "ProtoLoadFailed",
						}),
				}),
			);
			const Proto = GRPC.loadPackageDefinition(Definition)[
				"vine_ipc"
			] as GRPC.GrpcObject;
			const ServiceDefinition = Proto["CocoonService"]["service"];

			const ServerInstance = new GRPC.Server();
			const Implementation =
				CreateServiceImplementation(DispatcherService);
			ServerInstance.addService(ServiceDefinition, Implementation);

			yield* Generator(
				Effect.async<void, GPCConnectionError>((Resume) => {
					ServerInstance.bindAsync(
						Config.CocoonAddress,
						GRPC.ServerCredentials.createInsecure(),
						(Error, _Port) => {
							if (Error)
								Resume(
									Effect.fail(
										new GPCConnectionError({
											Cause: Error,
											Context: "ServerBindFailed",
										}),
									),
								);
							else {
								try {
									ServerInstance.start();
									Resume(Effect.void);
								} catch (CaughtError) {
									Resume(
										Effect.fail(
											new GPCConnectionError({
												Cause: CaughtError,
												Context: "ServerStartFailed",
											}),
										),
									);
								}
							}
						},
					);
				}),
			);
			yield* Generator(
				Effect.logInfo(
					`Cocoon gRPC server listening at ${Config.CocoonAddress}.`,
				),
			);
			return ServerInstance;
		}),
		(ServerInstance) => ReleaseServer(ServerInstance),
	),
}) {}
