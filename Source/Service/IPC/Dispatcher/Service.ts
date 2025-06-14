/**
 * @module Service (IPC/Dispatcher)
 * @description Defines the interface and Context.Tag for the Dispatcher service.
 * This service is the central router for all incoming RPC messages from the
 * Mountain host.
 */

import { Context, type Effect } from "effect";
import type { IDisposable } from "vscode";

import type { IPCError } from "../Error.js";

export interface Interface {
	/**
	 * Dispatches an incoming request from the host.
	 * It will first check for a custom invoke handler, then fall back to the
	 * main VS Code RPCProtocol.
	 * @param Method The name of the method being invoked.
	 * @param Parameters The arguments for the method.
	 * @returns An `Effect` that resolves with the result of the handler.
	 */
	readonly DispatchRequest: (
		Method: string,
		Parameters: any[],
	) => Effect.Effect<any, Error>;

	/**
	 * Dispatches an incoming fire-and-forget notification from the host.
	 * @param Method The name of the notification.
	 * @param Parameters The arguments for the notification.
	 */
	readonly DispatchNotification: (
		Method: string,
		Parameters: any[],
	) => Effect.Effect<void, never>;

	/**
	 * Dispatches an incoming cancellation signal from the host.
	 * @param RequestID The ID of the request to cancel.
	 */
	readonly CancelOperation: (RequestID: number) => Effect.Effect<void, never>;

	/**
	 * Processes raw binary data for the VS Code RPCProtocol by passing it to
	 * the underlying protocol adapter.
	 * @param Data The raw Uint8Array from the host.
	 */
	readonly ProcessIncomingData: (
		Data: Uint8Array,
	) => Effect.Effect<void, never>;

	/**
	 * Registers a custom handler for a specific invoke method from the host.
	 * This is used for top-level methods like `initExtensionHost` that are
	 * not part of the standard VS Code RPC protocol.
	 * @param Channel The channel/method name.
	 * @param Handler An async function that handles the request.
	 * @returns A `Disposable` to unregister the handler.
	 */
	readonly RegisterInvokeHandler: (
		Channel: string,
		Handler: (...Arguments: any[]) => Promise<any>,
	) => IDisposable;
}

export const Tag = Context.Tag<Interface>("IPC/Dispatcher");
