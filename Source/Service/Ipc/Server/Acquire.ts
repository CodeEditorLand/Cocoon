/**
 * @module Acquire
 * @description Defines the `Effect` for acquiring and starting the `Cocoon`
 * gRPC server as a managed resource.
 */

import * as Path from "path";
import * as gRPC from "@grpc/grpc-js";
import { gRPCObject, loadPackageDefinition } from "@grpc/proto-loader";
import { Effect } from "effect";

import { ConfigTag } from "../Configuration.js";
import { Tag as DispatcherTag } from "../Dispatcher/Service.js";
import { gRPCConnectionError } from "../Error.js";
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
			new gRPCConnectionError({ Cause, context: "ProtoLoadFailed" }),
	});

/**
 * An `Effect` that binds the gRPC server to a network address and starts it.
 * @param Server The gRPC server instance.
 * @param ServerAddress The address where the server should listen.
 */
const StartServer = (
	Server: Service,
	ServerAddress: string,
): Effect.Effect<void, gRPCConnectionError> =>
	Effect.async((Resume) => {
		Server.bindAsync(
			ServerAddress,
			gRPC.ServerCredentials.createInsecure(),
			(Error, _port) => {
				if (Error) {
					Resume(
						Effect.fail(
							new gRPCConnectionError({
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
								new gRPCConnectionError({
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
		const Configuration = yield* _(ConfigTag);
		const Dispatcher = yield* _(DispatcherTag);
		// Assume the proto file is copied to the dist output directory.
		const ProtoPath = Path.join(process.cwd(), "proto/vine.proto");

		const Definition = yield* _(LoadProtoDefinition(ProtoPath));
		const Proto = gRPC.loadPackageDefinition(Definition)
			.vine_ipc as gRPCObject;
		const ServiceDefinition = (Proto.CocoonService as any).service;

		const Server = new gRPC.Server();
		const Implementation = CreateServiceImplementation(Dispatcher);
		Server.addService(ServiceDefinition, Implementation);

		yield* _(StartServer(Server, Configuration.CocoonAddress));
		yield* _(
			Effect.logInfo(
				`Cocoon gRPC server listening at ${Configuration.CocoonAddress}.`,
			),
		);

		return Server;
	}),
	(Server) => Release(Server),
);
