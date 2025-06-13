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

export const Definition = Effect.gen(function* (_) {
	const ProtocolAdapterService = yield* _(ProtocolAdapter.Tag);
	const CancellationService = yield* _(Cancellation.Tag);
	const RPCProtocolInstance = new RPCProtocol(ProtocolAdapterService);
	const InvokeHandlers = yield* _(Ref.make(new Map<string, InvokeHandler>()));

	const DispatchRequest = (Method: string, Parameters: any[]) =>
		Effect.gen(function* (_) {
			const handlers = yield* _(Ref.get(InvokeHandlers));
			const customHandler = handlers.get(Method);

			if (customHandler) {
				// Handle with a custom registered handler (e.g., for `initExtensionHost`)
				return yield* _(
					Effect.tryPromise(() => customHandler(...Parameters)),
				);
			} else {
				// Fallback to the main RPCProtocol for standard ExtHost <-> MainThread messages.
				// This is a simplified representation of how VS Code's RPCProtocol works.
				// The real implementation is more complex and involves proxies.
				if ((RPCProtocolInstance as any)._getHandler) {
					const handler = (RPCProtocolInstance as any)._getHandler(
						Method,
					);
					if (handler) {
						return yield* _(
							Effect.tryPromise(() => handler(...Parameters)),
						);
					}
				}
				return yield* _(
					Effect.fail(
						new Error(`No handler found for RPC method: ${Method}`),
					),
				);
			}
		});

	const DispatchNotification = (Method: string, Parameters: any[]) =>
		Effect.sync(() => {
			// VS Code's `_receiveNotification` is synchronous
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
			Effect.runSync(registerEffect); // Must be sync for IDisposable return
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
