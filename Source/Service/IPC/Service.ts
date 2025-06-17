/*
 * File: Cocoon/Source/Service/IPC/Service.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:19 UTC
 * Dependency: ./Error/IPCError.js, effect, vs/base/parts/ipc/common/ipc.js, vscode
 * Export: IPCService
 */

/**
 * @module Service (IPC)
 * @description Defines the high-level service interface and `Context.Tag` for
 * Inter-Process Communication (IPC) between `Cocoon` and `Mountain`.
 */

import { Context, type Effect } from "effect";
import type { IMessagePassingProtocol } from "vs/base/parts/ipc/common/ipc.js";
import type { Disposable } from "vscode";

import IPCError from "./Error/IPCError.js";

/**
 * The `Context.Tag` for the `IPC.Service`.
 */
export default class IPCService extends Context.Tag("Service/IPC")<
	IPCService,
	{
		/**
		 * Sends a request to the `Mountain` host and returns an `Effect` that will
		 * resolve with the response or fail with an `IPCError`.
		 *
		 * @param Method The RPC method name to invoke on `Mountain`.
		 * @param Parameters The parameters for the RPC method.
		 * @param TimeoutMilliseconds Optional timeout for the request.
		 * @returns An `Effect` that resolves with the response from `Mountain`.
		 */
		readonly SendRequest: <Res = unknown>(
			Method: string,
			Parameters: readonly unknown[],
			TimeoutMilliseconds?: number,
		) => Effect.Effect<Res, IPCError>;

		/**
		 * Sends a fire-and-forget notification to the `Mountain` host.
		 *
		 * @param Method The RPC notification method name.
		 * @param Parameters The parameters for the notification.
		 * @returns An `Effect` that completes when the notification has been sent.
		 */
		readonly SendNotification: (
			Method: string,
			Parameters: readonly unknown[],
		) => Effect.Effect<void, IPCError>;

		/**
		 * Sends a cancellation signal for a previously sent request.
		 * @param RequestID The ID of the request to cancel.
		 */
		readonly SendCancel: (RequestID: number) => Effect.Effect<void, never>;

		/**
		 * Creates an adapter that conforms to VS Code's `IMessagePassingProtocol`.
		 * This allows the `RPCProtocol` to use this IPC service as its transport.
		 */
		readonly CreateProtocolAdapter: () => IMessagePassingProtocol;

		/**
		 * Creates a proxy object that can be used to invoke methods on the main thread.
		 * @param Channel The RPC channel prefix for the proxy.
		 */
		readonly CreateProxy: <T extends object>(Channel: string) => T;

		/**
		 * Registers a handler for "invoke" calls coming *from* `Mountain`.
		 * These are typically used for services `Cocoon` provides to `Mountain`.
		 * @param Channel The channel/method name.
		 * @param Handler An async function that handles the request.
		 */
		readonly RegisterInvokeHandler: (
			Channel: string,
			Handler: (...Arguments: any[]) => Promise<any>,
		) => Disposable;
	}
>() {}
