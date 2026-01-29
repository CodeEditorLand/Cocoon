/**
 * @module ErrorHandlingService
 * @description
 * Advanced error handling service with circuit breaker pattern.
 * Provides robust error recovery, circuit breaker logic, and automatic retry mechanisms.
 *
 * Based on enterprise error handling patterns with exponential backoff.
 */
import { Layer } from "effect";
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
/**
 * ErrorHandlingService implementation
 */
export declare class ErrorHandlingService {
    private readonly _serviceBrand;
    private circuitBreakers;
    private config;
    constructor();
    /**
     * Load default configuration
     */
    private loadDefaultConfig;
    /**
     * Execute operation with advanced error handling and metrics
     */
    executeWithRetry<T>(operation: () => Promise<T>, operationName: string, customConfig?: Partial<ErrorHandlingConfig>): Promise<ErrorHandlingResult<T>>;
    /**
     * Get circuit breaker state
     */
    private getCircuitBreakerState;
    /**
     * Record operation success
     */
    private recordSuccess;
    /**
     * Record operation failure
     */
    private recordFailure;
    /**
     * Calculate retry delay with jitter
     */
    private calculateRetryDelay;
    /**
     * Advanced error classification with ML-inspired patterns
     */
    private shouldRetry;
    /**
     * Determine if error is transient
     */
    private isTransientError;
    /**
     * Track operation success with advanced analytics
     */
    private trackOperationSuccess;
    /**
     * Adapt retry strategy based on historical patterns
     */
    private adaptRetryStrategy;
    /**
     * Track operation failure with advanced analytics
     */
    private trackOperationFailure;
    /**
     * Classify error for better analytics
     */
    private classifyError;
    /**
     * Track circuit breaker events
     */
    private trackCircuitBreakerEvent;
    /**
     * Delay execution
     */
    private delay;
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
 * Service layer for ErrorHandlingService
 */
export declare const ErrorHandlingServiceLayer: Layer.Layer<unknown, never, never>;
/**
 * Live implementation
 */
export declare const ErrorHandlingServiceLive: Layer.Layer<unknown, never, never>;
//# sourceMappingURL=ErrorHandlingService.d.ts.map