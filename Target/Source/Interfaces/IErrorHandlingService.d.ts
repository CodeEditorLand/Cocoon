/**
 * @module IErrorHandlingService
 * @description
 * Interface for advanced error handling service with circuit breaker pattern.
 * Provides robust error recovery, circuit breaker logic, and automatic retry mechanisms.
 */
import * as Effect from "effect/Effect";
export interface CircuitBreakerState {
    serviceName: string;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailureTime: number;
    successThreshold: number;
    failureThreshold: number;
    timeout: number;
}
export interface ErrorHandlingConfig {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
    circuitBreakerTimeout: number;
    circuitBreakerThreshold: number;
}
export interface ErrorHandlingResult<T> {
    success: boolean;
    result?: T;
    error?: Error;
    retries: number;
    duration: number;
    circuitBreakerState?: CircuitBreakerState;
}
export interface IErrorHandlingService {
    readonly _serviceBrand: undefined;
    /**
     * Execute operation with error handling
     */
    executeWithRetry<T>(operation: () => Promise<T>, operationName: string, customConfig?: Partial<ErrorHandlingConfig>): Promise<ErrorHandlingResult<T>>;
    /**
     * Get circuit breaker status
     */
    getCircuitBreakerStatus(serviceName: string): CircuitBreakerState | undefined;
    /**
     * Get all circuit breaker statuses
     */
    getAllCircuitBreakerStatuses(): CircuitBreakerState[];
    /**
     * Reset circuit breaker
     */
    resetCircuitBreaker(serviceName: string): void;
    /**
     * Update configuration
     */
    updateConfiguration(newConfig: Partial<ErrorHandlingConfig>): void;
    /**
     * Get service statistics
     */
    getStatistics(): {
        totalCircuitBreakers: number;
        openCircuitBreakers: number;
        halfOpenCircuitBreakers: number;
        closedCircuitBreakers: number;
        config: ErrorHandlingConfig;
    };
}
/**
 * Effect context for ErrorHandlingService
 */
export declare const IErrorHandlingService: <Self, Type extends Effect.Tag.AllowedType>() => import("effect/Context").TagClass<Self, IErrorHandlingService, Type> & (Type extends Record<PropertyKey, any> ? Effect.Tag.Proxy<Self, Type> : {}) & {
    use: <X>(body: (_: Type) => X) => [X] extends [Effect.Effect<infer A, infer E, infer R>] ? Effect.Effect<A, E, R | Self> : [X] extends [PromiseLike<infer A_1>] ? Effect.Effect<A_1, import("effect/Cause").UnknownException, Self> : Effect.Effect<X, never, Self>;
};
//# sourceMappingURL=IErrorHandlingService.d.ts.map