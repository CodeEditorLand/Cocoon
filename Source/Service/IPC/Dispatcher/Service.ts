/**
 * @module Service (IPC/Dispatcher)
 * @description Defines the interface and Context.Tag for the Dispatcher service.
 * This service is the central router for all incoming RPC messages from the
 * Mountain host.
 */

import { Context, type Effect } from "effect";
import type { Disposable } from "vscode";

export default class extends Context.Tag("IPC/Dispatcher")<
	any,
	{
		readonly DispatchRequest: (
			Method: string,
			ParameterArray: readonly any[],
		) => Effect.Effect<any, Error>;
		readonly DispatchNotification: (
			Method: string,
			ParameterArray: readonly any[],
		) => Effect.Effect<void, never>;
		readonly CancelOperation: (
			RequestID: number,
		) => Effect.Effect<void, never>;
		readonly ProcessIncomingData: (
			Data: Uint8Array,
		) => Effect.Effect<void, never>;
		readonly RegisterInvokeHandler: (
			Channel: string,
			Handler: (...ArgumentArray: any[]) => Promise<any>,
		) => Disposable;
	}
>() {}
