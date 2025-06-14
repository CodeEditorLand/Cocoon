/**
 * @module Service (IPC/Dispatcher)
 * @description Defines the interface and Context.Tag for the Dispatcher service.
 * This service is the central router for all incoming RPC messages from the
 * Mountain host.
 */

import { Context, type Effect } from "effect";
import type { Disposable } from "vscode";

import type { IPCError } from "../Error.js";

export class Dispatcher extends Context.Tag("IPC/Dispatcher")<
	Dispatcher,
	{
		readonly DispatchRequest: (
			Method: string,
			ParameterArray: any[],
		) => Effect.Effect<any, Error>;
		readonly DispatchNotification: (
			Method: string,
			ParameterArray: any[],
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
