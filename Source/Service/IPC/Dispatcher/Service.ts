/*
 * File: Cocoon/Source/Service/IPC/Dispatcher/Service.ts
 * Role: Defines the Dispatcher service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Act as the central router for all incoming RPC messages from the Mountain host.
 */

import { Context, Effect, Ref } from "effect";
import { RPCProtocol } from "vs/workbench/services/extensions/common/rpcProtocol.js";
import type { Disposable } from "vscode";

import { Cancellation } from "../../Cancellation/Service.js";
import { ProtocolAdapter } from "../ProtocolAdapter/Service.js";

type InvokeHandler = (...Arguments: any[]) => Promise<any>;

export class Dispatcher extends Effect.Service<Dispatcher>()("IPC/Dispatcher", {
	effect: Effect.gen(function* (Generator) {
		const ProtocolAdapterService = yield* Generator(ProtocolAdapter);
		const CancellationService = yield* Generator(Cancellation);

		const RPCProtocolInstance = new RPCProtocol(ProtocolAdapterService);
		const InvokeHandlersRef = yield* Generator(
			Ref.make(new Map<string, InvokeHandler>()),
		);

		const ServiceImplementation = {
			DispatchRequest: (Method: string, Parameters: readonly any[]) =>
				Effect.gen(function* (Generator) {
					const Handlers = yield* Generator(
						Ref.get(InvokeHandlersRef),
					);
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
						const Handler = (
							RPCProtocolInstance as any
						)._getHandler(Method);
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
							new Error(
								`No handler found for RPC method: ${Method}`,
							),
						),
					);
				}),
			DispatchNotification: (
				Method: string,
				Parameters: readonly any[],
			) =>
				Effect.sync(() => {
					if ((RPCProtocolInstance as any)._receiveNotification) {
						(RPCProtocolInstance as any)._receiveNotification(
							Method,
							Parameters,
						);
					}
				}),
			CancelOperation: CancellationService.CancelToken,
			ProcessIncomingData: ProtocolAdapterService.ProcessIncomingData,
			RegisterInvokeHandler: (
				Channel: string,
				Handler: InvokeHandler,
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
