/**
 * IPC Handler Module
 *
 * Connections:
 * - Mountain: Application state management and IPC orchestration
 * - Wind: WebView panel communication and event handling
 *
 * This module provides request/response handling with registration,
 * async execution, and cancellation support for inter-process
 * communication in the Mountain/Wind ecosystem.
 */
import { CancellationToken } from 'vscode';
import { Logger } from '../Utility/Logger';
import { Result } from '../Utility/Result';
/**
 * Represents a unique request identifier
 */
export type RequestId = string;
/**
 * Represents the type of operation being requested
 */
export declare enum OperationType {
    Query = "query",
    Mutation = "mutation",
    Subscription = "subscription",
    Notification = "notification"
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
export type RequestHandler<TInput = unknown, TOutput = unknown> = (request: Request<TInput>, token: CancellationToken) => Promise<Response<TOutput>>;
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
export declare class IPCHandler {
    private readonly handlers;
    private readonly pendingRequests;
    private readonly handlerStats;
    private readonly logger;
    private readonly config;
    private activeRequestCount;
    constructor(logger: Logger, config?: Partial<HandlerConfig>);
    /**
     * Registers a handler for the specified method
     *
     * @param method - The method name to register handler for
     * @param handler - The handler function to execute
     * @param options - Optional registration settings
     * @returns Result indicating success or failure
     */
    RegisterHandler<TInput, TOutput>(method: string, handler: RequestHandler<TInput, TOutput>, options?: HandlerOptions): Promise<Result<void, Error>>;
    /**
     * Handles an incoming request by routing to the appropriate handler
     *
     * @param request - The request to process
     * @param token - Optional cancellation token
     * @returns Promise resolving to the response
     */
    HandleRequest<TInput, TOutput>(request: Request<TInput>, token?: CancellationToken): Promise<Response<TOutput>>;
    /**
     * Cancels an ongoing operation by request ID
     *
     * @param requestId - The ID of the request to cancel
     * @returns Result indicating success or failure
     */
    CancelOperation(requestId: RequestId): Result<boolean, Error>;
    /**
     * Unregisters a handler for the specified method
     *
     * @param method - The method name to unregister
     * @returns Result indicating success or failure
     */
    UnregisterHandler(method: string): Result<boolean, Error>;
    /**
     * Gets statistics for a specific handler
     *
     * @param method - The method name to get stats for
     * @returns Handler statistics or undefined
     */
    GetHandlerStats(method: string): HandlerStats | undefined;
    /**
     * Gets all registered handler methods
     *
     * @returns Array of method names
     */
    GetRegisteredMethods(): string[];
    /**
     * Clears all registered handlers and pending requests
     */
    Dispose(): void;
    /**
     * Executes a handler with timeout support
     */
    private ExecuteWithTimeout;
    /**
     * Updates handler statistics after execution
     */
    private UpdateStats;
}
/**
 * Export default handler factory function
 */
export declare function CreateIPCHandler(logger: Logger, config?: Partial<HandlerConfig>): IPCHandler;
export {};
//# sourceMappingURL=Handler.d.ts.map