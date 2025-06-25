/**
 * @module IPC
 * @description Defines the high-level service for Inter-Process Communication (IPC)
 * between Cocoon and Mountain. It orchestrates gRPC client/server connections,
 * RPC protocol adaptation, and request/notification dispatching.
 */

import * as Path from "node:path";
import * as gRPC from "@grpc/grpc-js";
import * as ProtoLoader from "@grpc/proto-loader";
import { Effect, Ref } from "effect";
import { VSBuffer } from "vs/base/common/buffer.js";
import { Emitter } from "vs/base/common/event.js";
import type { IMessagePassingProtocol } from "vs/base/parts/ipc/common/ipc.js";
import { RPCProtocol } from "vs/workbench/services/extensions/common/rpcProtocol.js";
import type { Disposable } from "vscode";
import { CancellationService } from "./Cancellation.js";
import {
	GenericNotification,
	GenericRequest,
	type GenericResponse,
	RPCDataPayload,
} from "./IPC/Generated.js";
import type { MountainService } from "./IPC/Generated.js";
import { IPCProblem } from "./IPC/IPCProblem.js";
import { DecodeValue } from "./IPC/ProtoConverter/DecodeValue.js";
import { EncodeValue } from "./IPC/ProtoConverter/EncodeValue.js";
import { ProtoSerializationProblem } from "./IPC/ProtoConverter/ProtoSerializationProblem.js";
import { gRPCConnectionError } from "./IPC/gRPCConnectionError.js";
import { IPCConfigurationService } from "./IPCConfiguration.js";

/**
 * @interface IPC
 * @description The contract for the IPC service.
 */
export interface IPC {
	readonly SendRequest: <ResponseType = unknown>(
		Method: string,
		Parameters: readonly unknown[],
	) => Effect.Effect<ResponseType, IPCProblem>;
	readonly SendNotification: (
		Method: string,
		Parameters: readonly unknown[],
	) => Effect.Effect<void, IPCProblem>;
	readonly SendCancel: (TokenId: number) => Effect.Effect<void, never>;
	readonly CreateProtocolAdapter: () => IMessagePassingProtocol & {
		ProcessIncomingData: (Data: Uint8Array) => Effect.Effect<void, never>;
	};
	readonly CreateProxy: <T extends object>(Channel: string) => T;
	readonly RegisterInvokeHandler: (
		Channel: string,
		Handler: (...args: any[]) => Promise<any>,
	) => Disposable;
}

/**
 * @class IPCService
 * @description The `Effect.Service` for IPC. It is a scoped service because it
 * manages the lifecycle of a gRPC client, ensuring it is gracefully acquired and released.
 */
export class IPCService extends Effect.Service<IPCService>()("Service/IPC", {
	scoped: Effect.gen(function* () {
		const Config = yield* IPCConfigurationService;
		const Cancellation = yield* CancellationService;

		const GrpcClient = yield* Effect.acquireRelease(
			Effect.gen(function* () {
				const ProtoPath = Path.join(
					process.cwd(),
					"proto/vine.ipc.proto",
				);
				const Definition = yield* Effect.tryPromise({
					try: () =>
						ProtoLoader.load(ProtoPath, {
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
				const GrpcObject = gRPC.loadPackageDefinition(Definition);
				const ClientConstructor = (
					GrpcObject["vine_ipc"] as gRPC.GrpcObject
				)["MountainService"] as gRPC.ServiceClientConstructor;
				const Client = new ClientConstructor(
					Config.MountainAddress,
					gRPC.credentials.createInsecure(),
				) as unknown as MountainService & gRPC.Client;
				yield* Effect.async<void, gRPCConnectionError>((Resume) => {
					Client.waitForReady(
						Date.now() + 10_000,
						(Error?: Error) => {
							if (Error)
								Resume(
									Effect.fail(
										new gRPCConnectionError({
											Cause: Error,
											Context: "ClientNotReady",
										}),
									),
								);
							else Resume(Effect.void);
						},
					);
				});
				yield* Effect.logInfo(
					`gRPC client connected to Mountain at ${Config.MountainAddress}.`,
				);
				return Client;
			}),
			(Client) =>
				Effect.sync(() => Client.close()).pipe(
					Effect.tap(() =>
						Effect.logInfo("gRPC client connection closed."),
					),
				),
		);

		const RequestIdCounter = yield* Ref.make(1);
		const OnMessageEmitter = new Emitter<VSBuffer>();
		const InvokeHandlersRef = yield* Ref.make(
			new Map<string, (...args: any[]) => Promise<any>>(),
		);

		const SendRPCData = (Buffer: VSBuffer) =>
			Effect.tryPromise({
				try: () => {
					const Payload = new RPCDataPayload();
					Payload.setBuffer(Buffer.buffer);
					return GrpcClient.sendRPCDataToMountain(Payload);
				},
				catch: (Cause) =>
					new IPCProblem({
						Cause,
						Context: "sendRPCDataToMountain failed",
					}),
			}).pipe(
				Effect.catchAll((Error) =>
					Effect.logError("Failed to send RPC data via gRPC", Error),
				),
				Effect.asVoid,
			);

		const ProtocolAdapter: IMessagePassingProtocol = {
			send: (Buffer) => Effect.runFork(SendRPCData(Buffer)),
			onMessage: OnMessageEmitter.event,
		};

		const RPCProtocolInstance = new RPCProtocol(ProtocolAdapter);

		const ServiceImplementation: IPC = {
			SendRequest: <ResponseType = unknown>(
				Method: string,
				Parameters: readonly unknown[],
			) =>
				Effect.gen(function* () {
					const RequestId = yield* Ref.getAndUpdate(
						RequestIdCounter,
						(n) => n + 1,
					);
					const EncodedParameter = yield* EncodeValue(Parameters);
					const RequestMessage = new GenericRequest();
					RequestMessage.setRequestid(RequestId);
					RequestMessage.setMethod(Method);
					RequestMessage.setParams(EncodedParameter);
					const ResponseMessage = (yield* Effect.tryPromise({
						try: () =>
							GrpcClient.processCocoonRequest(RequestMessage),
						catch: (Cause) =>
							new IPCProblem({
								Cause,
								Context: `gRPC request '${Method}' failed.`,
							}),
					})) as typeof GenericResponse.prototype;
					const DecodedResult = yield* DecodeValue(
						ResponseMessage.getResult(),
					);
					return DecodedResult as ResponseType;
				}).pipe(
					Effect.mapError((Error) =>
						Error instanceof ProtoSerializationProblem
							? new IPCProblem({
									Cause: Error,
									Context:
										"Proto serialization/deserialization failed",
								})
							: Error,
					),
				),

			SendNotification: (Method, Parameters) =>
				Effect.gen(function* () {
					const EncodedParameter = yield* EncodeValue(Parameters);
					const NotificationMessage = new GenericNotification();
					NotificationMessage.setMethod(Method);
					NotificationMessage.setParams(EncodedParameter);
					yield* Effect.tryPromise({
						try: () =>
							GrpcClient.sendCocoonNotification(
								NotificationMessage,
							),
						catch: (Cause) =>
							new IPCProblem({
								Cause,
								Context: `gRPC notification '${Method}' failed.`,
							}),
					});
				}).pipe(
					Effect.mapError((Error) =>
						Error instanceof ProtoSerializationProblem
							? new IPCProblem({
									Cause: Error,
									Context:
										"Proto serialization/deserialization failed",
								})
							: Error,
					),
					Effect.asVoid,
				),

			SendCancel: Cancellation.CancelToken,

			CreateProtocolAdapter: () => ({
				send: ProtocolAdapter.send,
				onMessage: ProtocolAdapter.onMessage,
				...RPCProtocolInstance,
				ProcessIncomingData: (Data) =>
					Effect.sync(() =>
						OnMessageEmitter.fire(VSBuffer.wrap(Data)),
					),
			}),

			CreateProxy: <T extends object>(Channel: string): T => {
				return new Proxy({} as T, {
					get(_Target, Property) {
						if (
							typeof Property === "string" &&
							Property.startsWith("$")
						) {
							return (...Arguments: any[]) => {
								const Method = `${Channel}/${Property}`;
								return Effect.runPromise(
									ServiceImplementation.SendRequest(
										Method,
										Arguments,
									),
								);
							};
						}
						return (_Target as any)[Property];
					},
				});
			},

			RegisterInvokeHandler: (Channel, Handler) => {
				Effect.runSync(
					Ref.update(InvokeHandlersRef, (Map) =>
						Map.set(Channel, Handler),
					),
				);
				return {
					dispose: () => {
						Effect.runFork(
							Ref.update(
								InvokeHandlersRef,
								(Map) => (Map.delete(Channel), Map),
							),
						);
					},
				};
			},
		};

		return ServiceImplementation;
	}),
}) {}
