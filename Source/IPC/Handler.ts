/**
 * IPC Handler Module
 *
 * Connections:
 * - Mountain: Application state management and IPC orchestration
 * - Wind: Webview panel communication and event handling
 *
 * This module provides request/response handling with registration,
 * async execution, and cancellation support for inter-process
 * communication in the Mountain/Wind ecosystem.
 */

import type { CancellationToken } from "vscode";

// Real VS Code CancellationTokenSource - replaces the hand-rolled class below.
const { CancellationTokenSource } = await import(
	"@codeeditorland/output/vs/base/common/cancellation"
);

import { Logger } from "../Utility/Logger";
import { Result, type Err, type Ok } from "../Utility/Result";

/**
 * Represents a unique request identifier
 */
export type RequestId = string;

/**
 * Represents the type of operation being requested
 */
export enum OperationType {
	Query = "query",
	Mutation = "mutation",
	Subscription = "subscription",
	Notification = "notification",
}

/**
 * Generic request payload interface
 */
export interface Request<TPayload = unknown> {
	id: RequestId;
	type: OperationType;
	method: string;
	payload: TPayload;
	timestamp: number;
}

/**
 * Generic response payload interface
 */
export interface Response<TData = unknown, TError = unknown> {
	id: RequestId;
	success: boolean;
	data?: TData;
	error?: TError;
	timestamp: number;
}

/**
 * Handler function interface for processing requests
 */
export type RequestHandler<TInput = unknown, TOutput = unknown> = (
	request: Request<TInput>,
	token: CancellationToken,
) => Promise<Response<TOutput>>;

/**
 * Represents a registered handler with metadata
 */
interface HandlerRegistration {
	handler: RequestHandler;
	method: string;
	registeredAt: number;
	description?: string;
}

/**
 * Options for handler registration
 */
export interface HandlerOptions {
	description?: string;
	timeout?: number;
	retryAttempts?: number;
}

/**
 * Statistics for handler execution
 */
interface HandlerStats {
	totalCalls: number;
	successfulCalls: number;
	failedCalls: number;
	averageLatency: number;
	lastCalled: number;
}

/**
 * Configuration for the IPC Handler
 */
interface HandlerConfig {
	enableLogging: boolean;
	enableMetrics: boolean;
	defaultTimeout: number;
	maxConcurrentRequests: number;
}

/**
 * Main IPC Handler class responsible for request/response handling
 */
export class IPCHandler {
	private readonly handlers: Map<string, HandlerRegistration>;
	private readonly pendingRequests: Map<RequestId, CancellationTokenSource>;
	private readonly handlerStats: Map<string, HandlerStats>;
	private readonly logger: Logger;
	private readonly config: HandlerConfig;
	private activeRequestCount: number;

	constructor(logger: Logger, config?: Partial<HandlerConfig>) {
		this.handlers = new Map();
		this.pendingRequests = new Map();
		this.handlerStats = new Map();
		this.logger = logger;
		this.activeRequestCount = 0;

		this.config = {
			enableLogging: config?.enableLogging ?? true,
			enableMetrics: config?.enableMetrics ?? true,
			defaultTimeout: config?.defaultTimeout ?? 30000,
			maxConcurrentRequests: config?.maxConcurrentRequests ?? 100,
		};

		this.logger.info("IPCHandler initialized", config);
	}

	/**
	 * Registers a handler for the specified method
	 *
	 * @param method - The method name to register handler for
	 * @param handler - The handler function to execute
	 * @param options - Optional registration settings
	 * @returns Result indicating success or failure
	 */
	public async RegisterHandler<TInput, TOutput>(
		method: string,
		handler: RequestHandler<TInput, TOutput>,
		options?: HandlerOptions,
	): Promise<Result<void, Error>> {
		try {
			if (!method || method.trim().length === 0) {
				return Result.Err(new Error("Method name cannot be empty"));
			}

			if (typeof handler !== "function") {
				return Result.Err(new Error("Handler must be a function"));
			}

			if (this.handlers.has(method)) {
				const warning = `Handler for method '${method}' already exists. Overwriting.`;
				this.logger.warn(warning);
			}

			const registration: HandlerRegistration = {
				handler: handler as RequestHandler,
				method,
				registeredAt: Date.now(),
				description: options?.description,
			};

			// Initialize statistics for this handler
			if (this.config.enableMetrics) {
				this.handlerStats.set(method, {
					totalCalls: 0,
					successfulCalls: 0,
					failedCalls: 0,
					averageLatency: 0,
					lastCalled: 0,
				});
			}

			this.handlers.set(method, registration);

			this.logger.info(
				`Handler registered successfully for method: ${method}`,
				{ description: options?.description },
			);

			return Result.Ok(undefined);
		} catch (error) {
			const err =
				error instanceof Error ? error : new Error(String(error));
			this.logger.error(
				`Failed to register handler for method: ${method}`,
				err,
			);
			return Result.Err(err);
		}
	}

	/**
	 * Handles an incoming request by routing to the appropriate handler
	 *
	 * @param request - The request to process
	 * @param token - Optional cancellation token
	 * @returns Promise resolving to the response
	 */
	public async HandleRequest<TInput, TOutput>(
		request: Request<TInput>,
		token?: CancellationToken,
	): Promise<Response<TOutput>> {
		const requestId = request.id;
		const startTime = performance.now();

		try {
			// Validate request
			if (!request || !request.id || !request.method) {
				throw new Error("Invalid request: missing required fields");
			}

			// Check concurrent request limit
			if (this.activeRequestCount >= this.config.maxConcurrentRequests) {
				throw new Error(
					`Maximum concurrent requests (${this.config.maxConcurrentRequests}) reached`,
				);
			}

			this.activeRequestCount++;

			// Create cancellation token if not provided
			const tokenSource = new CancellationTokenSource();
			this.pendingRequests.set(requestId, tokenSource);

			// Check if request is already cancelled
			if (token?.isCancellationRequested) {
				throw new Error("Request was cancelled before execution");
			}

			// Find handler
			const registration = this.handlers.get(request.method);
			if (!registration) {
				throw new Error(
					`No handler registered for method: ${request.method}`,
				);
			}

			this.logger.debug(
				`Processing request for method: ${request.method}`,
				{ requestId, type: request.type },
			);

			// Execute handler with timeout
			const timeout = this.config.defaultTimeout;

			const response = await this.ExecuteWithTimeout(
				registration.handler,
				request,
				tokenSource.token,
				timeout,
			);

			// Update statistics
			if (this.config.enableMetrics) {
				this.UpdateStats(request.method, startTime, true);
			}

			return response;
		} catch (error) {
			// Update statistics on error
			if (this.config.enableMetrics) {
				this.UpdateStats(request.method, startTime, false);
			}

			const err =
				error instanceof Error ? error : new Error(String(error));
			this.logger.error(
				`Request failed for method: ${request.method}`,
				err,
				{ requestId },
			);

			return {
				id: requestId,
				success: false,
				error: err.message,
				timestamp: Date.now(),
			};
		} finally {
			this.activeRequestCount--;
			this.pendingRequests.delete(requestId);
		}
	}

	/**
	 * Cancels an ongoing operation by request ID
	 *
	 * @param requestId - The ID of the request to cancel
	 * @returns Result indicating success or failure
	 */
	public CancelOperation(requestId: RequestId): Result<boolean, Error> {
		try {
			if (!requestId) {
				return Result.Err(new Error("Request ID cannot be empty"));
			}

			const tokenSource = this.pendingRequests.get(requestId);
			if (!tokenSource) {
				return Result.Ok(false); // Not found, assume not running
			}

			tokenSource.cancel();
			this.pendingRequests.delete(requestId);

			this.logger.info(`Operation cancelled successfully`, { requestId });

			return Result.Ok(true);
		} catch (error) {
			const err =
				error instanceof Error ? error : new Error(String(error));
			this.logger.error(`Failed to cancel operation`, err, { requestId });
			return Result.Err(err);
		}
	}

	/**
	 * Unregisters a handler for the specified method
	 *
	 * @param method - The method name to unregister
	 * @returns Result indicating success or failure
	 */
	public UnregisterHandler(method: string): Result<boolean, Error> {
		try {
			if (!method) {
				return Result.Err(new Error("Method name cannot be empty"));
			}

			const existed = this.handlers.delete(method);
			this.handlerStats.delete(method);

			this.logger.info(`Handler unregistered for method: ${method}`, {
				existed,
			});

			return Result.Ok(existed);
		} catch (error) {
			const err =
				error instanceof Error ? error : new Error(String(error));
			this.logger.error(
				`Failed to unregister handler for method: ${method}`,
				err,
			);
			return Result.Err(err);
		}
	}

	/**
	 * Gets statistics for a specific handler
	 *
	 * @param method - The method name to get stats for
	 * @returns Handler statistics or undefined
	 */
	public GetHandlerStats(method: string): HandlerStats | undefined {
		return this.handlerStats.get(method);
	}

	/**
	 * Gets all registered handler methods
	 *
	 * @returns Array of method names
	 */
	public GetRegisteredMethods(): string[] {
		return Array.from(this.handlers.keys());
	}

	/**
	 * Clears all registered handlers and pending requests
	 */
	public Dispose(): void {
		this.logger.info("Disposing IPCHandler");

		// Cancel all pending requests
		for (const tokenSource of this.pendingRequests.values()) {
			try {
				tokenSource.cancel();
			} catch (error) {
				this.logger.warn(
					"Failed to cancel pending request during disposal",
					error,
				);
			}
		}

		this.handlers.clear();
		this.pendingRequests.clear();
		this.handlerStats.clear();
		this.activeRequestCount = 0;
	}

	/**
	 * Executes a handler with timeout support
	 */
	private async ExecuteWithTimeout<TInput, TOutput>(
		handler: RequestHandler<TInput, TOutput>,
		request: Request<TInput>,
		token: CancellationToken,
		timeoutMs: number,
	): Promise<Response<TOutput>> {
		return Promise.race([
			handler(request, token),
			new Promise<Response<TOutput>>((_, reject) =>
				setTimeout(
					() =>
						reject(
							new Error(`Request timeout after ${timeoutMs}ms`),
						),
					timeoutMs,
				),
			),
		]);
	}

	/**
	 * Updates handler statistics after execution
	 */
	private UpdateStats(
		method: string,
		startTime: number,
		success: boolean,
	): void {
		const stats = this.handlerStats.get(method);
		if (!stats) return;

		const latency = performance.now() - startTime;
		const totalCalls = stats.totalCalls + 1;

		stats.totalCalls = totalCalls;
		stats.successfulCalls += success ? 1 : 0;
		stats.failedCalls += success ? 0 : 1;
		stats.averageLatency =
			(stats.averageLatency * (totalCalls - 1) + latency) / totalCalls;
		stats.lastCalled = Date.now();

		this.handlerStats.set(method, stats);
	}
}

// CancellationTokenSource is now imported from @codeeditorland/output at the top of this file.

/**
 * Export default handler factory function
 */
export function CreateIPCHandler(
	logger: Logger,
	config?: Partial<HandlerConfig>,
): IPCHandler {
	return new IPCHandler(logger, config);
}
