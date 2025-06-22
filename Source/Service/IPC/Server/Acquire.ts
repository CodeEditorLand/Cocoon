/*
 * File: Cocoon/Source/Service/IPC/Server/Acquire.ts
 *
 * This file defines the `Effect` for acquiring and starting the `Cocoon`
 * gRPC server as a managed resource.
 */

import * as Path from "node:path";
import * as GRPC from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { Effect } from "effect";

import IPCConfigurationService from "../Configuration.js";
import DispatcherService from "../Dispatcher/Service.js";
import gRPCConnectionError from "../Error/gRPCConnectionError.js";
import CreateServiceImplementation from "./CreateServiceImplementation.js";
import Release from "./Release.js";

/**
 * An `Effect` that loads the gRPC `.proto` file definition from disk.
 */
const LoadProtoDefinition = (
	ProtoPath: string,
): Effect.Effect<protoLoader.PackageDefinition, gRPCConnectionError> => {
	return Effect.tryPromise({
		try: () =>
			protoLoader.load(ProtoPath, {
				keepCase: true,
				longs: String,
				enums: String,
				defaults: true,
				oneofs: true,
			}),
		catch: (cause) =>
			new gRPCConnectionError({
				Cause: cause,
				Context: "ProtoLoadFailed",
			}),
	});
};

/**
 * An `Effect` that starts the gRPC server and binds it to the specified address.
 */
const StartServer = (
	Server: GRPC.Server,
	ServerAddress: string,
): Effect.Effect<void, gRPCConnectionError> => {
	return Effect.async<void, gRPCConnectionError>((Resume) => {
		Server.bindAsync(
			ServerAddress,
			GRPC.ServerCredentials.createInsecure(),
			(Error, _Port) => {
				if (Error) {
					Resume(
						Effect.fail(
							new gRPCConnectionError({
								Cause: Error,
								Context: "ServerBindFailed",
							}),
						),
					);
				} else {
					try {
						Server.start();
						Resume(Effect.void);
					} catch (CaughtError) {
						Resume(
							Effect.fail(
								new gRPCConnectionError({
									Cause: CaughtError,
									Context: "ServerStartFailed",
								}),
							),
						);
					}
				}
			},
		);
	});
};

/**
 * An `Effect` that acquires the gRPC server as a managed resource. This handles
 * loading the protocol definition, creating the server with its service implementation,
 * starting it, and registering a release action.
 */
export default Effect.acquireRelease(
	Effect.gen(function* () {
		const Configuration = yield* IPCConfigurationService;
		const Dispatcher = yield* DispatcherService;
		const ProtoPath = Path.join(process.cwd(), "proto/vine.proto");

		const Definition = yield* LoadProtoDefinition(ProtoPath);
		const Proto = GRPC.loadPackageDefinition(Definition)[
			"vine_ipc"
		] as GRPC.GrpcObject;
		const ServiceDefinition = Proto["CocoonService"]["service"];

		const Server = new GRPC.Server();
		const Implementation = CreateServiceImplementation(Dispatcher);
		Server.addService(ServiceDefinition, Implementation);

		yield* StartServer(Server, Configuration.CocoonAddress);
		yield* Effect.logInfo(
			`Cocoon gRPC server listening at ${Configuration.CocoonAddress}.`,
		);

		return Server;
	}),
	(Server) => Release(Server).pipe(Effect.orDie),
);
