/**
 * @module Service (IPC/Dispatcher)
 * @description Defines the interface and Context.Tag for the Dispatcher service.
 */

import { Context, Effect } from "effect";
import type { IDisposable } from "vscode";

export interface Interface {
	/**
	 * Dispatches an incoming request from the host.
	 * It will first check for a custom invoke handler, then fall back to the
	 * main VS Code RPCProtocol.
	 */
	readonly DispatchRequest: (
		Method: string,
		Parameters: any[],
	) => Effect.Effect<any, Error>;

	/**
	 * Dispatches an incoming notification from the host.
	 */
	readonly DispatchNotification: (
		Method: string,
		Parameters: any[],
	) => Effect.Effect<void, never>;

	/**
	 * Dispatches an incoming cancellation signal from the host.
	 */
	readonly CancelOperation: (RequestId: number) => Effect.Effect<void, never>;

	/**
	 * Processes raw binary data for the VS Code RPCProtocol.
	 */
	readonly ProcessIncomingData: (
		Data: Uint8Array,
	) => Effect.Effect<void, never>;

	/**
	 * Registers a custom handler for a specific invoke method from the host.
	 */
	readonly RegisterInvokeHandler: (
		Channel: string,
		Handler: (...Args: any[]) => Promise<any>,
	) => IDisposable;
}

export const Tag = Context.Tag<Interface>("Ipc/Dispatcher");
