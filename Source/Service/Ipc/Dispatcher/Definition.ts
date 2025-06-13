/**
 * @module Definition (IPC/Dispatcher)
 * @description The live implementation of the Dispatcher service.
 */

import { Effect, Ref } from "effect";
import { RPCProtocol } from "vs/workbench/services/extensions/common/rpcProtocol.js";
import type { IDisposable } from "vscode";

import { Tag as CancellationTokenTag } from "../../Cancellation/Service.js";
import { Tag as ProtocolAdapterTag } from "../ProtocolAdapter/Service.js";
import type { Interface } from "./Service.js";

type InvokeHandler = (...Args: any[]) => Promise<any>;

export const Definition = Effect.gen(function* (_) {
	const Adapter = yield* _(ProtocolAdapterTag);
	const Cancellation = yield* _(CancellationTokenTag);
	const RPCProtocolInstance = new RPCProtocol(Adapter);
	const InvokeHandlers = yield* _(Ref.make(new Map<string, InvokeHandler>()));

	const DispatchRequestEffect = (Method: string, Parameters: any[]) =>
		Effect.gen(function* (_) {
			const handlers = yield* _(Ref.get(InvokeHandlers));
			const customHandler = handlers.get(Method);

			if (customHandler) {
				// Handle with a custom registered handler (e.g., for `initExtensionHost`)
				return yield* _(
					Effect.tryPromise(() => customHandler(...Parameters)),
				);
			} else {
				// Fallback to the main RPCProtocol for standard ExtHost <-> MainThread messages
				return yield* _(
					Effect.tryPromise(
						() =>
							(RPCProtocolInstance as any)._receiveRequest(
								0,
								Method,
								Parameters,
							), // ID is not used by VS Code's impl here
					),
				);
			}
		});

	const DispatchNotificationEffect = (Method: string, Parameters: any[]) =>
		Effect.sync(() => {
			// VS Code's `_receiveNotification` is synchronous
			(RPCProtocolInstance as any)._receiveNotification(
				Method,
				Parameters,
			);
		});

	const ServiceImplementation: Interface = {
		DispatchRequest: DispatchRequestEffect,
		DispatchNotification: DispatchNotificationEffect,
		CancelOperation: Cancellation.CancelToken,
		ProcessIncomingData: Adapter.ProcessIncomingData,
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
