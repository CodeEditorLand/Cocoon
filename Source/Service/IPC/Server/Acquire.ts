/**
 * @module Acquire (IPC/Server)
 * @description Defines the `Effect` for acquiring and starting the `Cocoon`
 * gRPC server as a managed resource.
 */

import * as Path from "node:path";
import * as GRPC from "@grpc/grpc-js";
import {
	loadPackageDefinition,
	type GrpcObject,
	type PackageDefinition,
} from "@grpc/proto-loader";
import { Effect } from "effect";

import ConfigurationService from "../Configuration.js";
import DispatcherService from "../Dispatcher/Service.js";
import { gRPCConnectionError } from "../Error.js";
import CreateServiceImplementation from "./CreateServiceImplementation.js";
import Release from "./Release.js";
import type ServerService from "./Service.js";

const LoadProtoDefinition = (
	ProtoPath: string,
): Effect.Effect<PackageDefinition, gRPCConnectionError> => {
	return Effect.tryPromise({
		try: () =>
			loadPackageDefinition({
				path: ProtoPath,
				keepCase: true,
				longs: String,
				enums: String,
				defaults: true,
				oneofs: true,
			}),
		catch: (Cause) =>
			new gRPCConnectionError({ Cause, Context: "ProtoLoadFailed" }),
	});
};

const StartServer = (
	Server: ServerService,
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

export default Effect.acquireRelease(
	Effect.gen(function* () {
		const Config = yield* ConfigurationService;
		const Dispatcher = yield* DispatcherService;
		const ProtoPath = Path.join(process.cwd(), "proto/vine.proto");

		const Definition = yield* LoadProtoDefinition(ProtoPath);
		const Proto = (gRPC.loadPackageDefinition(Definition) as any)
			.vine_ipc as GrpcObject;
		const ServiceDefinition = (Proto.CocoonService as any).service;

		const Server = new GRPC.Server();
		const Implementation = CreateServiceImplementation(Dispatcher);
		Server.addService(ServiceDefinition, Implementation);

		yield* StartServer(Server as any, Config.CocoonAddress);
		yield* Effect.logInfo(
			`Cocoon gRPC server listening at ${Config.CocoonAddress}.`,
		);

		return Server as ServerService;
	}),
	(Server) => Release(Server).pipe(Effect.orDie),
);
