/*
 * File: Cocoon/Source/Service/IPC/Service.ts
 * Role: Defines the interface and Effect.Service for Inter-Process Communication.
 * Responsibilities:
 *   - Declare the contract for the high-level IPC service between Cocoon and Mountain.
 *   - Provide the `Effect.Service` class that acts as the dependency injection tag.
 */

import { Effect } from "effect";
import type { IMessagePassingProtocol } from "vs/base/parts/ipc/common/ipc.js";
import type { Disposable } from "vscode";
import type { IPCConfiguration } from "./Type.js";
import type { IPCProblem } from "./Error.js";

/**
 * The `Effect.Service` for the `IPCConfiguration`.
 * This allows the configuration to be provided and injected as a formal dependency.
 */
export class Configuration extends Effect.Service<IPCConfiguration>(
	"Service/IPCConfiguration",
) {}

/**
 * The `Effect.Service` for the main IPC service. It defines the high-level API
 * for sending requests, notifications, and managing communication protocols.
 */
export class IPC extends Effect.Service<IPC>("Service/IPC")<{
	/**
	 * Sends a request to the `Mountain` host and returns an `Effect` that will
	 * resolve with the response or fail with an `IPCProblem`.
	 */
	readonly SendRequest: <ResponseType = unknown>(
		Method: string,
		Parameters: readonly unknown[],
		TimeoutMilliseconds?: number,
	) => Effect.Effect<ResponseType, IPCProblem>;

	/**
	 * Sends a fire-and-forget notification to the `Mountain` host.
	 */
	readonly SendNotification: (
		Method: string,
		Parameters: readonly unknown[],
	) => Effect.Effect<void, IPCProblem>;

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
}>() {}
