/**
 * @module Definition (IPC/Dispatcher)
 * @description The live implementation of the Dispatcher service.
 */

import { Effect, Ref } from "effect";
import { RPCProtocol } from "vs/workbench/services/extensions/common/rpcProtocol.js";
import type { IDisposable } from "vscode";

import { Cancellation } from "../../Cancellation.js";
import { ProtocolAdapter } from "../ProtocolAdapter.js";
import type { Interface } from "./Service.js";

type InvokeHandler = (...Arguments: any[]) => Promise<any>;

export const Definition = Effect.gen(function* () {
	const ProtocolAdapterService = yield* ProtocolAdapter.Tag;
	const CancellationService = yield* Cancellation.Tag;
	const RPCProtocolInstance = new RPCProtocol(ProtocolAdapterService as any);
	const InvokeHandlers = yield* Ref.make(new Map<string, InvokeHandler>());

	const DispatchRequest = (Method: string, Parameters: any[]) =>
		Effect.gen(function* () {
			const handlers = yield* Ref.get(InvokeHandlers);
			const customHandler = handlers.get(Method);

			if (customHandler) {
				return yield* Effect.tryPromise(() =>
					customHandler(...Parameters),
				);
			} else {
				if ((RPCProtocolInstance as any)._getHandler) {
					const handler = (RPCProtocolInstance as any)._getHandler(
						Method,
					);
					if (handler) {
						return yield* Effect.tryPromise(() =>
							handler(...Parameters),
						);
					}
				}
				return yield* Effect.fail(
					new Error(`No handler found for RPC method: ${Method}`),
				);
			}
		});

	const DispatchNotification = (Method: string, Parameters: any[]) =>
		Effect.sync(() => {
			if ((RPCProtocolInstance as any)._receiveNotification) {
				(RPCProtocolInstance as any)._receiveNotification(
					Method,
					Parameters,
				);
			}
		});

	const ServiceImplementation: Interface = {
		DispatchRequest,
		DispatchNotification,
		CancelOperation: CancellationService.CancelToken,
		ProcessIncomingData: ProtocolAdapterService.ProcessIncomingData,
		RegisterInvokeHandler: (Channel, Handler) => {
			const registerEffect = Ref.update(InvokeHandlers, (map) =>
				map.set(Channel, Handler),
			);
			Effect.runSync(registerEffect);
			return {
				dispose: () => {
					const unregisterEffect = Ref.update(
						InvokeHandlers,
						(map) => (map.delete(Channel), map),
					);
					Effect.runFork(unregisterEffect);
				},
			};
		},
	};

	return ServiceImplementation;
});
