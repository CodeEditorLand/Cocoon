/*
 * File: Cocoon/Source/Service/IPC/Client/Service.ts
 * Role: Defines the gRPC Client service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Manage the managed gRPC client connection from Cocoon to Mountain.
 *   - Expose the connection as a self-contained, scoped Layer.
 */

import * as GRPC from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { Effect } from "effect";
import * as Path from "node:path";

import { Configuration as IPCConfiguration } from "../Configuration.js";
import { GRPCConnectionProblem } from "../Error/gRPCConnectionError.js";
import type { MountainService } from "../Generated.js";

type ClientInstance = MountainService & GRPC.Client;

// --- Internal Helper Logic ---
const LoadProtoDefinition = (
	ProtoPath: string,
): Effect.Effect<protoLoader.PackageDefinition, GRPCConnectionProblem> =>
	Effect.tryPromise({
		try: () =>
			protoLoader.load(ProtoPath, {
				keepCase: true,
				longs: String,
				enums: String,
				defaults: true,
				oneofs: true,
			}),
		catch: (Cause) =>
			new GRPCConnectionProblem({ Cause, Context: "ProtoLoadFailed" }),
	});

const CreateClientInstance = (
	PackageDefinition: GRPC.GrpcObject,
	ServerAddress: string,
): Effect.Effect<ClientInstance, GRPCConnectionProblem> =>
	Effect.try({
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
			new GRPCConnectionProblem({
				Cause,
				Context: "ClientInstantiationFailed",
			}),
	});

const WaitForClientReady = (
	Client: ClientInstance,
): Effect.Effect<void, GRPCConnectionProblem> =>
	Effect.async<void, GRPCConnectionProblem>((Resume) => {
		Client.waitForReady(Date.now() + 10_000, (Error?: Error) => {
			if (Error)
				Resume(
					Effect.fail(
						new GRPCConnectionProblem({
							Cause: Error,
							Context: "ClientNotReady",
						}),
					),
				);
			else Resume(Effect.void);
		});
	});

const ReleaseClient = (Client: ClientInstance) =>
	Effect.sync(() => Client.close()).pipe(
		Effect.tap(() => Effect.logInfo("gRPC client connection closed.")),
	);

// --- Service Definition ---
export class Client extends Effect.Service<MountainService>()("IPC/Client", {
	scoped: Effect.acquireRelease(
		Effect.gen(function* (Generator) {
			const Config = yield* Generator(IPCConfiguration);
			const ProtoPath = Path.join(process.cwd(), "proto/vine.ipc.proto");
			const Definition = yield* Generator(LoadProtoDefinition(ProtoPath));
			const GrpcObject = GRPC.loadPackageDefinition(Definition);
			const ClientInstance = yield* Generator(
				CreateClientInstance(GrpcObject, Config.MountainAddress),
			);
			yield* Generator(WaitForClientReady(ClientInstance));
			yield* Generator(
				Effect.logInfo(
					`gRPC client connected to Mountain at ${Config.MountainAddress}.`,
				),
			);
			return ClientInstance;
		}),
		(Client) => ReleaseClient(Client),
	),
}) {}
