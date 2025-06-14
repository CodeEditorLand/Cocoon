/**
 * @module Acquire (IPC/Server)
 * @description Defines the `Effect` for acquiring and starting the `Cocoon`
 * gRPC server as a managed resource.
 */

import * as Path from "node:path";
import * as gRPC from "@grpc/grpc-js";
import {
	loadPackageDefinition,
	type GrpcObject,
	type PackageDefinition,
} from "@grpc/proto-loader";
import { Effect } from "effect";

import { Configuration as ConfigurationService } from "../Configuration.js";
import { Dispatcher } from "../Dispatcher.js";
import { gRPCConnectionError } from "../Error.js";
import { CreateServiceImplementation } from "./CreateServiceImplementation.js";
import { Release } from "./Release.js";
import type { Interface as ServerService } from "./Service.js";

function LoadProtoDefinition(
	ProtoPath: string,
): Effect.Effect<PackageDefinition, gRPCConnectionError> {
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
}

function StartServer(
	Server: ServerService,
	ServerAddress: string,
): Effect.Effect<void, gRPCConnectionError> {
	return Effect.async<void, gRPCConnectionError>((Resume) => {
		Server.bindAsync(
			ServerAddress,
			gRPC.ServerCredentials.createInsecure(),
			(Error, _port) => {
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
					} catch (e) {
						Resume(
							Effect.fail(
								new gRPCConnectionError({
									Cause: e,
									Context: "ServerStartFailed",
								}),
							),
						);
					}
				}
			},
		);
	});
}

export const Acquire = Effect.acquireRelease(
	Effect.gen(function* () {
		const Config = yield* ConfigurationService.Tag;
		const DispatcherService = yield* Dispatcher.Tag;
		const ProtoPath = Path.join(process.cwd(), "proto/vine.proto");

		const Definition = yield* LoadProtoDefinition(ProtoPath);
		const Proto = (gRPC.loadPackageDefinition(Definition) as any)
			.vine_ipc as GrpcObject;
		const ServiceDefinition = (Proto.CocoonService as any).service;

		const Server = new gRPC.Server();
		const Implementation = CreateServiceImplementation(DispatcherService);
		Server.addService(ServiceDefinition, Implementation);

		yield* StartServer(Server, Config.CocoonAddress);
		yield* Effect.logInfo(
			`Cocoon gRPC server listening at ${Config.CocoonAddress}.`,
		);

		return Server;
	}),
	(Server) => Release(Server).pipe(Effect.orDie),
);
