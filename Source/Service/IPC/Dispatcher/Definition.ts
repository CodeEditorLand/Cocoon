/**
 * @module Definition (IPC/Dispatcher)
 * @description The live implementation of the Dispatcher service.
 */

import { Effect, Ref } from "effect";
import { RPCProtocol } from "vs/workbench/services/extensions/common/rpcProtocol.js";

import CancellationService from "../../Cancellation/Service.js";
import ProtocolAdapterService from "../ProtocolAdapter/Service.js";
import type Service from "./Service.js";

type InvokeHandler = (...Arguments: any[]) => Promise<any>;

export default Effect.gen(function* () {
	const ProtocolAdapter = yield* ProtocolAdapterService;
	const Cancellation = yield* CancellationService;
	const RPCProtocolInstance = new RPCProtocol(ProtocolAdapter);
	const InvokeHandlers = yield* Ref.make(new Map<string, InvokeHandler>());

	const DispatchRequest = (Method: string, Parameters: any[]) =>
		Effect.gen(function* () {
			const Handlers = yield* Ref.get(InvokeHandlers);
			const CustomHandler = Handlers.get(Method);

			if (CustomHandler) {
				return yield* Effect.tryPromise({
					try: () => CustomHandler(...Parameters),
					catch: (e) => e as Error,
				});
			} else {
				if ((RPCProtocolInstance as any)._getHandler) {
					const Handler = (RPCProtocolInstance as any)._getHandler(
						Method,
					);
					if (Handler) {
						return yield* Effect.tryPromise({
							try: () => Handler(...Parameters),
							catch: (e) => e as Error,
						});
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

	const DispatcherImplementation: Service["Type"] = {
		DispatchRequest,
		DispatchNotification,
		CancelOperation: Cancellation.CancelToken,
		ProcessIncomingData: ProtocolAdapter.ProcessIncomingData,
		RegisterInvokeHandler: (Channel, Handler) => {
			const RegisterEffect = Ref.update(InvokeHandlers, (Map) =>
				Map.set(Channel, Handler),
			);
			Effect.runSync(RegisterEffect);
			return {
				dispose: () => {
					const UnregisterEffect = Ref.update(
						InvokeHandlers,
						(Map) => (Map.delete(Channel), Map),
					);
					Effect.runFork(UnregisterEffect);
				},
			};
		},
	};

	return DispatcherImplementation;
});
