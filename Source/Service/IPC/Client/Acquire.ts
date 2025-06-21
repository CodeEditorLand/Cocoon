/**
 * @module Acquire (IPC/Client)
 * @description Defines the `Effect` for acquiring and preparing the gRPC client
 * resource, which is responsible for communication with the `Mountain` backend.
 */

import * as Path from "node:path";
import * as GRPC from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { Effect } from "effect";

import IPCConfigurationService from "../Configuration.js";
import gRPCConnectionError from "../Error/gRPCConnectionError.js";
import type { MountainService } from "../Generated.js";
import Release from "./Release.js";

type ClientInstance = MountainService & GRPC.Client;

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
		catch: (Cause) =>
			new gRPCConnectionError({
				Cause,
				Context: "ProtoLoadFailed",
			}),
	});
};

/**
 * An `Effect` that creates an insecure gRPC client instance from a loaded
 * package definition.
 */
const CreateClientInstance = (
	PackageDefinition: GRPC.GrpcObject,
	ServerAddress: string,
): Effect.Effect<ClientInstance, gRPCConnectionError> => {
	return Effect.try({
		try: () => {
			const Proto = PackageDefinition["vine_ipc"] as GRPC.GrpcObject;
			const ClientConstructor = Proto[
				"MountainService"
			] as GRPC.ServiceClientConstructor;
			return new ClientConstructor(
				ServerAddress,
				GRPC.credentials.createInsecure(),
			) as unknown as ClientInstance;
		},
		catch: (Cause) =>
			new gRPCConnectionError({
				Cause,
				Context: "ClientInstantiationFailed",
			}),
	});
};

/**
 * An `Effect` that waits for the gRPC client to establish a ready connection.
 */
const WaitForClientReady = (
	Client: ClientInstance,
): Effect.Effect<void, gRPCConnectionError> => {
	return Effect.async<void, gRPCConnectionError>((Resume) => {
		// Set a 10-second timeout for the client to become ready.
		Client.waitForReady(Date.now() + 10_000, (Error?: Error) => {
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
				Resume(Effect.void);
			}
		});
	});
};

/**
 * An `Effect` that acquires the gRPC client as a managed resource. This effect
 * handles loading the protocol definition, creating the client, waiting for a
 * connection, and registering a release action.
 * @export
 * @default
 */
export default Effect.acquireRelease(
	Effect.gen(function* () {
		// Step 1: Get the IPC configuration from the context.
		const Configuration = yield* IPCConfigurationService;
		const ProtoPath = Path.join(process.cwd(), "proto/vine.proto");

		// Step 2: Load the .proto definition and create the gRPC client.
		const Definition = yield* LoadProtoDefinition(ProtoPath);
		const GrpcObject = GRPC.loadPackageDefinition(Definition);
		const Client = yield* CreateClientInstance(
			GrpcObject,
			Configuration.MountainAddress,
		);

		// Step 3: Wait for the client to connect to the server.
		yield* WaitForClientReady(Client);
		yield* Effect.logInfo(
			`gRPC client connected to Mountain at ${Configuration.MountainAddress}.`,
		);

		// Step 4: Return the ready client.
		return Client;
	}),
	(Client) => Release(Client),
);
