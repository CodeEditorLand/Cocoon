/**
 * @module Service (IPC)
 * @description Defines the high-level service interface and `Context.Tag` for
 * Inter-Process Communication (IPC) between `Cocoon` and `Mountain`.
 */

import { Context, Effect } from "effect";
import type { IMessagePassingProtocol } from "vs/base/parts/ipc/common/ipc.js";
import type { IDisposable } from "vscode";

import type { IPCError } from "./Error.js";

/**
 * The primary service interface for IPC.
 *
 * This service abstracts the underlying communication mechanism (e.g., gRPC)
 * and provides a simple, `Effect`-based API for sending requests and
 * notifications to the `Mountain` host. It also allows for creating an
 * `RPCProtocol` adapter and registering handlers for calls *from* `Mountain`.
 */
export interface Interface {
	/**
	 * Sends a request to the `Mountain` host and returns an `Effect` that will
	 * resolve with the response or fail with an `IPCError`.
	 *
	 * @param Method The RPC method name to invoke on `Mountain`.
	 * @param Parameter The parameters for the RPC method.
	 * @param TimeoutMilliseconds Optional timeout for the request.
	 * @returns An `Effect` that resolves with the response from `Mountain`.
	 */
	readonly SendRequest: <Res = unknown>(
		Method: string,
		Parameter: unknown,
		TimeoutMilliseconds?: number,
	) => Effect.Effect<Res, IPCError>;

	/**
	 * Sends a fire-and-forget notification to the `Mountain` host.
	 *
	 * @param Method The RPC notification method name.
	 * @param Parameter The parameters for the notification.
	 * @returns An `Effect` that completes when the notification has been sent.
	 */
	readonly SendNotification: (
		Method: string,
		Parameter: unknown,
	) => Effect.Effect<void, IPCError>;

	/**
	 * Sends a cancellation signal for a previously sent request.
	 * @param RequestID The ID of the request to cancel.
	 */
	readonly SendCancel: (RequestID: number) => Effect.Effect<void, IPCError>;

	/**
	 * Creates an adapter that conforms to VS Code's `IMessagePassingProtocol`.
	 * This allows the `RPCProtocol` to use this IPC service as its transport.
	 */
	readonly CreateProtocolAdapter: () => IMessagePassingProtocol;

	/**
	 * Registers a handler for "invoke" calls coming *from* `Mountain`.
	 * These are typically used for services `Cocoon` provides to `Mountain`.
	 * @param Channel The channel/method name.
	 * @param Handler An async function that handles the request.
	 */
	readonly RegisterInvokeHandler: (
		Channel: string,
		Handler: (...Arguments: any[]) => Promise<any>,
	) => IDisposable;
}

/**
 * The `Context.Tag` for the `IPC.Service`.
 */
export const Tag = Context.Tag<Interface>("Service/IPC");
