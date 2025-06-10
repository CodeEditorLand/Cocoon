/**
 * @module Acquire
 * @description Defines the `Effect` for acquiring and preparing the gRPC client
 * resource, which is responsible for communication with the `Mountain` backend.
 */

import * as Path from "path";
import * as Grpc from "@grpc/grpc-js";
import {
	GrpcObject,
	loadPackageDefinition,
	ServiceClientConstructor,
} from "@grpc/proto-loader";
import { Effect } from "effect";

import { ConfigTag } from "../Config.js";
import { GrpcConnectionError } from "../Error.js";
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
 * An `Effect` that creates an insecure gRPC client instance from a loaded
 * package definition.
 * @param PackageDefinition The loaded gRPC package definition.
 * @param ServerAddress The address of the `Mountain` gRPC server.
 */
const CreateClientInstance = (
	PackageDefinition: Grpc.PackageDefinition,
	ServerAddress: string,
) =>
	Effect.try({
		try: () => {
			const Proto = Grpc.loadPackageDefinition(PackageDefinition)
				.vine_ipc as GrpcObject;
			const ClientConstructor =
				Proto.MountainService as ServiceClientConstructor;
			return new ClientConstructor(
				ServerAddress,
				Grpc.credentials.createInsecure(),
			) as Service;
		},
		catch: (Cause) =>
			new GrpcConnectionError({
				Cause,
				context: "ClientInstantiationFailed",
			}),
	});

/**
 * An `Effect` that waits for the gRPC client to establish a ready connection
 * with the server, with a 10-second timeout.
 * @param Client The gRPC client instance.
 */
const WaitForClientReady = (Client: Service) =>
	Effect.async<void, GrpcConnectionError>((Resume) => {
		Client.waitForReady(Date.now() + 10000, (Error) => {
			if (Error) {
				Resume(
					Effect.fail(
						new GrpcConnectionError({
							Cause: Error,
							context: "ClientNotReady",
						}),
					),
				);
			} else {
				Resume(Effect.succeed(void 0));
			}
		});
	});

/**
 * An `Effect` that acquires the gRPC client as a managed resource.
 *
 * It orchestrates loading the proto definition, creating the client instance,
 * waiting for it to be ready, and associating it with a release finalizer to
 * ensure the client is properly closed on shutdown.
 */
export const Acquire = Effect.acquireRelease(
	Effect.gen(function* (_) {
		const Config = yield* _(ConfigTag);
		// Assume the proto file is copied to the dist output directory.
		const ProtoPath = Path.join(process.cwd(), "proto/vine.proto");

		const Definition = yield* _(LoadProtoDefinition(ProtoPath));
		const Client = yield* _(
			CreateClientInstance(Definition, Config.MountainAddress),
		);

		yield* _(WaitForClientReady(Client));
		yield* _(
			Effect.logInfo(
				`gRPC client connected to Mountain at ${Config.MountainAddress}.`,
			),
		);

		return Client;
	}),
	(Client) => Release(Client),
);
