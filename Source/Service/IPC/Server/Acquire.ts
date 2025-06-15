/**
 * @module Acquire (IPC/Server)
 * @description Defines the `Effect` for acquiring and starting the `Cocoon`
 * gRPC server as a managed resource.
 */

import * as Path from "node:path";
import * as GRPC from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { Effect } from "effect";

import DispatcherService from "../Dispatcher/Service.js";
import { gRPCConnectionError } from "../Error.js";
import CreateServiceImplementation from "./CreateServiceImplementation.js";
import Release from "./Release.js";

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
				cause,
				context: "ProtoLoadFailed",
			}),
	});
};

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
								cause: Error,
								context: "ServerBindFailed",
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
									cause: CaughtError,
									context: "ServerStartFailed",
								}),
							),
						);
					}
				}
			},
		);
	});
};

export default Effect.acquireRelease(
	Effect.gen(function* () {
		const Config = yield* ConfigurationService;
		const Dispatcher = yield* DispatcherService;
		const ProtoPath = Path.join(process.cwd(), "proto/vine.proto");

		const Definition = yield* LoadProtoDefinition(ProtoPath);
		const Proto = (GRPC.loadPackageDefinition(Definition) as any)
			.vine_ipc as GRPC.GrpcObject;
		const ServiceDefinition = (Proto.CocoonService as any).service;

		const Server = new GRPC.Server();
		const Implementation = CreateServiceImplementation(Dispatcher);
		Server.addService(ServiceDefinition, Implementation);

		yield* StartServer(Server, Config.CocoonAddress);
		yield* Effect.logInfo(
			`Cocoon gRPC server listening at ${Config.CocoonAddress}.`,
		);

		return Server;
	}),
	(Server) => Release(Server).pipe(Effect.orDie),
);
