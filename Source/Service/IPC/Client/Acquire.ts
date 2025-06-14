/**
 * @module Acquire (IPC/Client)
 * @description Defines the `Effect` for acquiring and preparing the gRPC client
 * resource, which is responsible for communication with the `Mountain` backend.
 */

import * as Path from "node:path";
import * as GRPC from "@grpc/grpc-js";
import {
	loadPackageDefinition,
	type GrpcObject,
	type PackageDefinition,
	type ServiceClientConstructor,
} from "@grpc/proto-loader";
import { Effect } from "effect";

import ConfigurationServiceTag from "../Configuration/Service.js";
import { GRPCConnectionError } from "../Error/GRPCConnectionError.js";
import Release from "./Release.js";
import type ClientService from "./Service.js";

/**
 * An `Effect` that loads the gRPC `.proto` file definition from disk.
 */
function LoadProtoDefinition(
	ProtoPath: string,
): Effect.Effect<PackageDefinition, GRPCConnectionError> {
	return Effect.tryPromise({
		try: () =>
			loadPackageDefinition({
				path: ProtoPath,
				keepCase: true,
				longs: String,
				enums: String,
				defaults: true,
				oneofs: true,
			} as any),
		catch: (Cause) =>
			new GRPCConnectionError({ Cause, Context: "ProtoLoadFailed" }),
	});
}

/**
 * An `Effect` that creates an insecure gRPC client instance from a loaded
 * package definition.
 */
function CreateClientInstance(
	PackageDefinition: GrpcObject,
	ServerAddress: string,
): Effect.Effect<ClientService, GRPCConnectionError> {
	return Effect.try({
		try: () => {
			const Proto = (
				GRPC.loadPackageDefinition(PackageDefinition as any) as any
			).vine_ipc as GrpcObject;
			const ClientConstructor =
				Proto.MountainService as ServiceClientConstructor;
			return new ClientConstructor(
				ServerAddress,
				GRPC.credentials.createInsecure(),
			) as ClientService;
		},
		catch: (Cause) =>
			new GRPCConnectionError({
				Cause,
				Context: "ClientInstantiationFailed",
			}),
	});
}

/**
 * An `Effect` that waits for the gRPC client to establish a ready connection.
 */
function WaitForClientReady(
	Client: ClientService,
): Effect.Effect<void, GRPCConnectionError> {
	return Effect.async<void, GRPCConnectionError>((Resume) => {
		(Client as any).waitForReady(Date.now() + 10000, (Error?: Error) => {
			if (Error) {
				Resume(
					Effect.fail(
						new GRPCConnectionError({
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
}

/**
 * An `Effect` that acquires the gRPC client as a managed resource.
 */
export default Effect.acquireRelease(
	Effect.gen(function* (Yield) {
		const Config = yield* Yield(ConfigurationServiceTag);
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
