/**
 * @module Acquire (IPC/Client)
 * @description Defines the `Effect` for acquiring and preparing the gRPC client
 * resource, which is responsible for communication with the `Mountain` backend.
 */

import * as Path from "node:path";
import * as gRPC from "@grpc/grpc-js";
import {
	loadPackageDefinition,
	type GrpcObject,
	type PackageDefinition,
	type ServiceClientConstructor,
} from "@grpc/proto-loader";
import { Effect } from "effect";

import { Configuration } from "../Configuration.js";
import { gRPCConnectionError } from "../Error.js";
import { MountainServiceClient } from "../Generated.js";
import { Release } from "./Release.js";
import type { Interface as ClientService } from "./Service.js";

/**
 * An `Effect` that loads the gRPC `.proto` file definition from disk.
 * @param ProtoPath The absolute path to the `vine.proto` file.
 */
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

/**
 * An `Effect` that creates an insecure gRPC client instance from a loaded
 * package definition.
 * @param PackageDefinition The loaded gRPC package definition.
 * @param ServerAddress The address of the `Mountain` gRPC server.
 */
function CreateClientInstance(
	PackageDefinition: GrpcObject,
	ServerAddress: string,
): Effect.Effect<ClientService, gRPCConnectionError> {
	return Effect.try({
		try: () => {
			const Proto = (
				gRPC.loadPackageDefinition(PackageDefinition as any) as any
			).vine_ipc as GrpcObject;
			const ClientConstructor =
				Proto.MountainService as ServiceClientConstructor;
			return new ClientConstructor(
				ServerAddress,
				gRPC.credentials.createInsecure(),
			) as ClientService;
		},
		catch: (Cause) =>
			new gRPCConnectionError({
				Cause,
				Context: "ClientInstantiationFailed",
			}),
	});
}

/**
 * An `Effect` that waits for the gRPC client to establish a ready connection
 * with the server, with a 10-second timeout.
 * @param Client The gRPC client instance.
 */
function WaitForClientReady(
	Client: ClientService,
): Effect.Effect<void, gRPCConnectionError> {
	return Effect.async<void, gRPCConnectionError>((Resume) => {
		(Client as any).waitForReady(Date.now() + 10000, (Error?: Error) => {
			if (Error) {
				Resume(
					Effect.fail(
						new gRPCConnectionError({
							Cause: Error,
							Context: "ClientNotReady",
						}),
					),
				);
			} else {
				Resume(Effect.succeedVoid);
			}
		});
	});
}

/**
 * An `Effect` that acquires the gRPC client as a managed resource.
 *
 * It orchestrates loading the proto definition, creating the client instance,
 * waiting for it to be ready, and associating it with a release finalizer to
 * ensure the client is properly closed on shutdown.
 */
export const Acquire = Effect.acquireRelease(
	Effect.gen(function* () {
		const Config = yield* Configuration;
		const ProtoPath = Path.join(process.cwd(), "proto/vine.proto");

		const Definition = yield* LoadProtoDefinition(ProtoPath);
		const Client = yield* CreateClientInstance(
			Definition as GrpcObject,
			Config.MountainAddress,
		);

		yield* WaitForClientReady(Client);
		yield* Effect.logInfo(
			`gRPC client connected to Mountain at ${Config.MountainAddress}.`,
		);

		return Client;
	}),
	(Client) => Release(Client),
);
