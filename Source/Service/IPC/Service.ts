/*
 * File: Cocoon/Source/Service/IPC/Service.ts
 * Role: Defines the IPC service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Declare the contract for high-level IPC between Cocoon and Mountain.
 *   - Provide the `Effect.Service` class and its default Layer, which composes
 *     the gRPC client, server, dispatcher, and protocol adapter.
 */

import * as GRPC from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { Effect, Layer, Ref } from "effect";
import * as Path from "node:path";
import { RPCProtocol } from "vs/workbench/services/extensions/common/rpcProtocol.js";
import { VSBuffer } from "vs/base/common/buffer.js";
import { Emitter } from "vs/base/common/event.js";
import type { IMessagePassingProtocol } from "vs/base/parts/ipc/common/ipc.js";
import type { Disposable } from "vscode";

import { Cancellation } from "../Cancellation/Service.js";
import { Configuration as IPCConfiguration } from "./Configuration.js";
import { IPCProblem, GRPCConnectionProblem } from "./Error.js";
import { Proto } from "./Generated.js";
import { ProtoSerializationProblem } from "./ProtoConverter/Error.js";

// --- Internal gRPC Client Logic ---
const AcquireGRPCClient = Effect.acquireRelease(
	Effect.gen(function* (Generator) {
		const Config = yield* Generator(IPCConfiguration);
		const ProtoPath = Path.join(process.cwd(), "proto/vine.ipc.proto");
		const Definition = yield* Generator(
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
					new GRPCConnectionProblem({
						Cause,
						Context: "ProtoLoadFailed",
					}),
			}),
		);
		const GrpcObject = GRPC.loadPackageDefinition(Definition);
		const ClientConstructor = (GrpcObject["vine_ipc"] as GRPC.GrpcObject)[
			"MountainService"
		] as GRPC.ServiceClientConstructor;
		const Client = new ClientConstructor(
			Config.MountainAddress,
			GRPC.credentials.createInsecure(),
		) as Proto.MountainService & GRPC.Client;

		yield* Generator(
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
			}),
		);
		yield* Generator(
			Effect.logInfo(
				`gRPC client connected to Mountain at ${Config.MountainAddress}.`,
			),
		);
		return Client;
	}),
	(Client) =>
		Effect.sync(() => Client.close()).pipe(
			Effect.tap(() => Effect.logInfo("gRPC client connection closed.")),
		),
);

// --- Main IPC Service Definition ---
export class IPC extends Effect.Service<IPC>()("Service/IPC", {
	scoped: Effect.gen(function* (Generator) {
		const GRPCClient = yield* Generator(AcquireGRPCClient);
		const CancellationService = yield* Generator(Cancellation);
		const RequestIDCounter = yield* Generator(Ref.make(1));

		// --- Protocol Adapter Logic ---
		const OnMessageEmitter = new Emitter<VSBuffer>();
		const SendRPCData = (Buffer: VSBuffer) =>
			Effect.tryPromise({
				try: () => {
					const Payload = new Proto.RPCDataPayload();
					Payload.setBuffer(Buffer.buffer);
					return GRPCClient.sendRPCDataToMountain(Payload);
				},
				catch: (Cause) =>
					new IPCProblem({
						Cause,
						context: "sendRPCDataToMountain failed",
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

		// --- Dispatcher Logic ---
		const RPCProtocolInstance = new RPCProtocol(ProtocolAdapter);
		const InvokeHandlersRef = yield* Generator(
			Ref.make(new Map<string, (...args: any[]) => Promise<any>>()),
		);

		const DispatchRequest = (Method: string, Parameters: readonly any[]) =>
			Effect.gen(function* (Generator) {
				const Handlers = yield* Generator(Ref.get(InvokeHandlersRef));
				const CustomHandler = Handlers.get(Method);
				if (CustomHandler) {
					return yield* Generator(
						Effect.tryPromise({
							try: () => CustomHandler(...Parameters),
							catch: (e) => e as Error,
						}),
					);
				}
				if ((RPCProtocolInstance as any)._getHandler) {
					const Handler = (RPCProtocolInstance as any)._getHandler(
						Method,
					);
					if (Handler) {
						return yield* Generator(
							Effect.tryPromise({
								try: () => Handler(...Parameters),
								catch: (e) => e as Error,
							}),
						);
					}
				}
				return yield* Generator(
					Effect.fail(
						new Error(`No handler found for RPC method: ${Method}`),
					),
				);
			});

		// --- Service Implementation ---
		const ServiceImplementation = {
			SendRequest: <ResponseType = unknown>(
				Method: string,
				Parameters: readonly unknown[],
			) =>
				Effect.gen(function* (Generator) {
					const RequestID = yield* Generator(
						Ref.getAndUpdate(RequestIDCounter, (n) => n + 1),
					);
					const EncodedParameter = yield* Generator(
						EncodeValue(Parameters),
					);
					const RequestMessage = new Proto.GenericRequest();
					RequestMessage.setRequestid(RequestID);
					RequestMessage.setMethod(Method);
					RequestMessage.setParams(EncodedParameter);

					const ResponseMessage = (yield* Generator(
						Effect.tryPromise({
							try: () =>
								GRPCClient.processCocoonRequest(RequestMessage),
							catch: (Cause) =>
								new IPCProblem({
									Cause,
									Context: `gRPC request '${Method}' failed.`,
								}),
						}),
					)) as typeof Proto.GenericResponse.prototype;

					const DecodedResult = yield* Generator(
						DecodeValue(ResponseMessage.getResult()),
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
							: (Error as IPCProblem),
					),
				),

			SendNotification: (
				Method: string,
				Parameters: readonly unknown[],
			) =>
				Effect.gen(function* (Generator) {
					const EncodedParameter = yield* Generator(
						EncodeValue(Parameters),
					);
					const NotificationMessage = new Proto.GenericNotification();
					NotificationMessage.setMethod(Method);
					NotificationMessage.setParams(EncodedParameter);
					yield* Generator(
						Effect.tryPromise({
							try: () =>
								GRPCClient.sendCocoonNotification(
									NotificationMessage,
								),
							catch: (Cause) =>
								new IPCProblem({
									Cause,
									Context: `gRPC notification '${Method}' failed.`,
								}),
						}),
					);
				}).pipe(
					Effect.mapError((Error) =>
						Error instanceof ProtoSerializationProblem
							? new IPCProblem({
									Cause: Error,
									Context:
										"Proto serialization/deserialization failed",
								})
							: (Error as IPCProblem),
					),
					Effect.asVoid,
				),

			SendCancel: CancellationService.CancelToken,

			CreateProtocolAdapter: () => ({
				...ProtocolAdapter,
				ProcessIncomingData: (Data: Uint8Array) =>
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

			RegisterInvokeHandler: (
				Channel: string,
				Handler: (...args: any[]) => Promise<any>,
			): Disposable => {
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
