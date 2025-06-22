/*
 * File: Cocoon/Source/Service/IPC/Service.ts
 *
 * This file defines the high-level service interface and `Context.Tag` for
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
		 */
		readonly SendRequest: <Res = unknown>(
			Method: string,
			Parameters: readonly unknown[],
			TimeoutMilliseconds?: number,
		) => Effect.Effect<Res, IPCError>;

		/**
		 * Sends a fire-and-forget notification to the `Mountain` host.
		 */
		readonly SendNotification: (
			Method: string,
			Parameters: readonly unknown[],
		) => Effect.Effect<void, IPCError>;

		/**
		 * Sends a cancellation signal for a previously sent request.
		 */
		readonly SendCancel: (RequestID: number) => Effect.Effect<void, never>;

		/**
		 * Creates an adapter that conforms to VS Code's `IMessagePassingProtocol`.
		 */
		readonly CreateProtocolAdapter: () => IMessagePassingProtocol;

		/**
		 * Creates a proxy object that can be used to invoke methods on the main thread.
		 */
		readonly CreateProxy: <T extends object>(Channel: string) => T;

		/**
		 * Registers a handler for "invoke" calls coming *from* `Mountain`.
		 */
		readonly RegisterInvokeHandler: (
			Channel: string,
			Handler: (...Arguments: any[]) => Promise<any>,
		) => Disposable;
	}
>() {}
