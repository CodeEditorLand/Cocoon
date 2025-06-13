/**
 * @module Acquire (IPC/Server)
 * @description Defines the `Effect` for acquiring and starting the `Cocoon`
 * gRPC server as a managed resource.
 */

import * as Path from "node:path";
import * as gRPC from "@grpc/grpc-js";
import { loadPackageDefinition, type GrpcObject } from "@grpc/proto-loader";
import { Effect } from "effect";

import { Configuration } from "../Configuration.js";
import { Dispatcher } from "../Dispatcher/Service.js";
import { gRPCConnectionError } from "../Error.js";
import { CreateServiceImplementation } from "./CreateServiceImplementation.js";
import { Release } from "./Release.js";
import type { Interface as ServerService } from "./Service.js";

/**
 * An `Effect` that loads the gRPC `.proto` file definition from disk.
 * @param ProtoPath The absolute path to the `vine.proto` file.
 */
function LoadProtoDefinition(ProtoPath: string) {
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

/**
 * An `Effect` that binds the gRPC server to a network address and starts it.
 * @param Server The gRPC server instance.
 * @param ServerAddress The address where the server should listen.
 */
function StartServer(
	Server: ServerService,
	ServerAddress: string,
): Effect.Effect<void, gRPCConnectionError> {
	return Effect.async((Resume) => {
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
						Resume(Effect.succeed(void 0));
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

/**
 * An `Effect` that acquires the gRPC server as a managed resource.
 *
 * It orchestrates loading the proto definition, creating the service
 * implementation, adding it to a new server instance, starting the server,
 * and associating it with a release finalizer.
 */
export const Acquire = Effect.acquireRelease(
	Effect.gen(function* (_) {
		const Config = yield* _(Configuration.Tag);
		const DispatcherService = yield* _(Dispatcher.Tag);
		// Assume the proto file is copied to the dist output directory.
		const ProtoPath = Path.join(process.cwd(), "proto/vine.proto");

		const Definition = yield* _(LoadProtoDefinition(ProtoPath));
		const Proto = gRPC.loadPackageDefinition(Definition)
			.vine_ipc as GrpcObject;
		const ServiceDefinition = (Proto.CocoonService as any).service;

		const Server = new gRPC.Server();
		const Implementation = CreateServiceImplementation(DispatcherService);
		Server.addService(ServiceDefinition, Implementation);

		yield* _(StartServer(Server, Config.CocoonAddress));
		yield* _(
			Effect.logInfo(
				`Cocoon gRPC server listening at ${Config.CocoonAddress}.`,
			),
		);

		return Server;
	}),
	(Server) => Release(Server),
);
