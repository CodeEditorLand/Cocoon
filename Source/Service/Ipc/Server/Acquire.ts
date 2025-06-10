/**
 * @module Acquire
 * @description Defines the `Effect` for acquiring and starting the `Cocoon`
 * gRPC server as a managed resource.
 */

import * as Path from "path";
import * as Grpc from "@grpc/grpc-js";
import { GrpcObject, loadPackageDefinition } from "@grpc/proto-loader";
import { Effect } from "effect";

import { ConfigTag } from "../Config.js";
import { Tag as DispatcherTag } from "../Dispatcher/Service.js";
import { GrpcConnectionError } from "../Error.js";
import { CreateServiceImplementation } from "./CreateServiceImplementation.js";
import { Release } from "./Release.js";
import type { Service } from "./Service.js";

/**
 * An `Effect` that loads the gRPC `.proto` file definition from disk.
 * @param ProtoPath The absolute path to the `vine.proto` file.
 */
const LoadProtoDefinition = (ProtoPath: string) =>
	Effect.tryPromise({
		try: () => loadPackageDefinition(ProtoPath),
		catch: (Cause) =>
			new GrpcConnectionError({ Cause, context: "ProtoLoadFailed" }),
	});

/**
 * An `Effect` that binds the gRPC server to a network address and starts it.
 * @param Server The gRPC server instance.
 * @param ServerAddress The address where the server should listen.
 */
const StartServer = (
	Server: Service,
	ServerAddress: string,
): Effect.Effect<void, GrpcConnectionError> =>
	Effect.async((Resume) => {
		Server.bindAsync(
			ServerAddress,
			Grpc.ServerCredentials.createInsecure(),
			(Error, _port) => {
				if (Error) {
					Resume(
						Effect.fail(
							new GrpcConnectionError({
								Cause: Error,
								context: "ServerBindFailed",
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
								new GrpcConnectionError({
									Cause: e,
									context: "ServerStartFailed",
								}),
							),
						);
					}
				}
			},
		);
	});

/**
 * An `Effect` that acquires the gRPC server as a managed resource.
 *
 * It orchestrates loading the proto definition, creating the service
 * implementation, adding it to a new server instance, starting the server,
 * and associating it with a release finalizer.
 */
export const Acquire = Effect.acquireRelease(
	Effect.gen(function* (_) {
		const Config = yield* _(ConfigTag);
		const Dispatcher = yield* _(DispatcherTag);
		// Assume the proto file is copied to the dist output directory.
		const ProtoPath = Path.join(process.cwd(), "proto/vine.proto");

		const Definition = yield* _(LoadProtoDefinition(ProtoPath));
		const Proto = Grpc.loadPackageDefinition(Definition)
			.vine_ipc as GrpcObject;
		const ServiceDefinition = (Proto.CocoonService as any).service;

		const Server = new Grpc.Server();
		const Implementation = CreateServiceImplementation(Dispatcher);
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
