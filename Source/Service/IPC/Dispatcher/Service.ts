/*
 * File: Cocoon/Source/Service/IPC/Dispatcher/Service.ts
 * Responsibility: Implements the Dispatcher service for the Cocoon sidecar, routing incoming RPC messages from the Mountain backend via the Vine IPC layer to appropriate handlers and managing request/notification lifecycle.
 * Modified: 2025-06-17 10:32:33 UTC
 * Dependency: effect, vscode
 * Export: DispatcherService
 */

/**
 * @module Service (IPC/Dispatcher)
 * @description Defines the interface and Context.Tag for the Dispatcher service.
 * This service is the central router for all incoming RPC messages from the
 * Mountain host.
 */

import { Context, type Effect } from "effect";
import type { Disposable } from "vscode";

export default class DispatcherService extends Context.Tag("IPC/Dispatcher")<
	DispatcherService,
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
