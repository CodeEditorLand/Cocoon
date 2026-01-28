/**
 * @module ErrorHandlingService
 * @description
 * Advanced error handling service with circuit breaker pattern.
 * Provides robust error recovery, circuit breaker logic, and automatic retry mechanisms.
 * 
 * Based on enterprise error handling patterns with exponential backoff.
 */

import { Effect, Layer } from "effect";

// Circuit breaker state
export interface CircuitBreakerState {
    serviceName: string;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailureTime: number;
    successThreshold: number;
    failureThreshold: number;
    timeout: number;
}

// Error handling configuration
export interface ErrorHandlingConfig {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
    circuitBreakerTimeout: number;
    circuitBreakerThreshold: number;
}

// Error handling result
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
export class ErrorHandlingService {
    private readonly _serviceBrand: undefined;
    
    private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
    private config: ErrorHandlingConfig;
    
    constructor() {
        this._serviceBrand = undefined;
        this.config = this.loadDefaultConfig();
        console.log("[ErrorHandlingService] Initializing error handling service");
    }
    
    /**
     * Load default configuration
     */
    private loadDefaultConfig(): ErrorHandlingConfig {
        return {
            maxRetries: 3,
            retryDelay: 1000, // 1 second
            exponentialBackoff: true,
            circuitBreakerTimeout: 30000, // 30 seconds
            circuitBreakerThreshold: 5
        };
    }
    
    /**
	 * Execute operation with advanced error handling and metrics
	 */
	async executeWithRetry<T>(
		operation: () => Promise<T>,
		operationName: string,
		customConfig?: Partial<ErrorHandlingConfig>
	): Promise<ErrorHandlingResult<T>> {
		const startTime = Date.now();
		const config = { ...this.config, ...customConfig };
		
		console.log(`[ErrorHandlingService] Executing operation: ${operationName}`);
		
		// Enhanced circuit breaker state check with metrics
		const circuitState = this.getCircuitBreakerState(operationName);
		if (circuitState.state === 'OPEN') {
			const error = new Error(`Circuit breaker is OPEN for ${operationName} (failures: ${circuitState.failureCount})`);
			console.warn(`[ErrorHandlingService] Circuit breaker blocked operation: ${operationName}`);
			
			// Track circuit breaker metrics
			this.trackCircuitBreakerEvent(operationName, 'blocked');
			
			return {
				success: false,
				error,
				retries: 0,
				duration: Date.now() - startTime,
				circuitBreakerState: circuitState,
				metrics: {
					circuitBreakerBlocked: true,
					totalRetries: 0,
					executionTime: Date.now() - startTime
				}
			};
		}
		
		let lastError: Error | undefined;
		let totalRetries = 0;
		
		for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
			try {
				const operationStartTime = Date.now();
				const result = await operation();
				const operationDuration = Date.now() - operationStartTime;
				
				// Record success with performance metrics
				this.recordSuccess(operationName);
				this.trackOperationSuccess(operationName, operationDuration, attempt);
				
				console.log(`[ErrorHandlingService] Operation ${operationName} succeeded on attempt ${attempt + 1} in ${operationDuration}ms`);
				
				return {
					success: true,
					result,
					retries: attempt,
					duration: Date.now() - startTime,
					circuitBreakerState: this.getCircuitBreakerState(operationName),
					metrics: {
						totalRetries: attempt,
						executionTime: Date.now() - startTime,
						operationDuration,
						circuitBreakerBlocked: false
					}
				};
				
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				totalRetries = attempt;
				
				console.warn(`[ErrorHandlingService] Operation ${operationName} failed on attempt ${attempt + 1}:`, error);
				
				// Record failure with error categorization
				this.recordFailure(operationName);
				this.trackOperationFailure(operationName, error, attempt);
				
				// Enhanced retry logic with error type analysis
				if (attempt < config.maxRetries && this.shouldRetry(error)) {
					const delay = this.calculateRetryDelay(attempt, config);
					console.log(`[ErrorHandlingService] Retrying ${operationName} in ${delay}ms`);
					await this.delay(delay);
				} else {
					// Stop retrying if error is non-retryable
					break;
				}
			}
		}
		
		console.error(`[ErrorHandlingService] Operation ${operationName} failed after ${totalRetries} retries`);
		
		return {
			success: false,
			error: lastError,
			retries: totalRetries,
			duration: Date.now() - startTime,
			circuitBreakerState: this.getCircuitBreakerState(operationName),
			metrics: {
				totalRetries,
				executionTime: Date.now() - startTime,
				circuitBreakerBlocked: false,
				finalFailure: true
			}
    }
    
    /**
     * Get circuit breaker state
     */
    private getCircuitBreakerState(serviceName: string): CircuitBreakerState {
        if (!this.circuitBreakers.has(serviceName)) {
            this.circuitBreakers.set(serviceName, {
                serviceName,
                state: 'CLOSED',
                failureCount: 0,
                lastFailureTime: 0,
                successThreshold: 3,
                failureThreshold: this.config.circuitBreakerThreshold,
                timeout: this.config.circuitBreakerTimeout
            });
        }
        
        const state = this.circuitBreakers.get(serviceName)!;
        
        // Check if circuit breaker should transition from OPEN to HALF_OPEN
        if (state.state === 'OPEN' && Date.now() - state.lastFailureTime > state.timeout) {
            state.state = 'HALF_OPEN';
            console.log(`[ErrorHandlingService] Circuit breaker for ${serviceName} transitioned to HALF_OPEN`);
        }
        
        return state;
    }
    
    /**
     * Record operation success
     */
    private recordSuccess(serviceName: string): void {
        const state = this.getCircuitBreakerState(serviceName);
        
        if (state.state === 'HALF_OPEN') {
            // Success in HALF_OPEN state - close the circuit
            state.state = 'CLOSED';
            state.failureCount = 0;
            console.log(`[ErrorHandlingService] Circuit breaker for ${serviceName} closed after successful operation`);
        } else if (state.state === 'CLOSED') {
            // Reset failure count on success
            state.failureCount = Math.max(0, state.failureCount - 1);
        }
    }
    
    /**
     * Record operation failure
     */
    private recordFailure(serviceName: string): void {
        const state = this.getCircuitBreakerState(serviceName);
        state.failureCount++;
        state.lastFailureTime = Date.now();
        
        if (state.state === 'HALF_OPEN') {
            // Failure in HALF_OPEN state - reopen the circuit
            state.state = 'OPEN';
            console.log(`[ErrorHandlingService] Circuit breaker for ${serviceName} reopened after failure in HALF_OPEN state`);
        } else if (state.state === 'CLOSED' && state.failureCount >= state.failureThreshold) {
            // Too many failures - open the circuit
            state.state = 'OPEN';
            console.warn(`[ErrorHandlingService] Circuit breaker for ${serviceName} opened after ${state.failureCount} failures`);
        }
    }
    
    /**
	 * Calculate retry delay with jitter
	 */
	private calculateRetryDelay(attempt: number, config: ErrorHandlingConfig): number {
		if (!config.exponentialBackoff) {
			return config.retryDelay;
		}
		
		// Exponential backoff with jitter: base * 2^attempt ± random jitter
		const baseDelay = config.retryDelay * Math.pow(2, attempt);
		const jitter = Math.random() * baseDelay * 0.1; // 10% jitter
		const finalDelay = baseDelay + (Math.random() > 0.5 ? jitter : -jitter);
		
		// Cap at maximum delay of 30 seconds
		return Math.min(finalDelay, 30000);
	}
	
	/**
	 * Determine if error is retryable
	 */
	private shouldRetry(error: Error): boolean {
		const nonRetryableErrors = [
			'InvalidArgument',
			'NotFound',
			'AlreadyExists',
			'PermissionDenied',
			'Unauthenticated'
		];
		
		const errorMessage = error.message.toLowerCase();
		return !nonRetryableErrors.some(pattern => errorMessage.includes(pattern.toLowerCase()));
	}
	
	/**
	 * Track operation success metrics
	 */
	private trackOperationSuccess(operationName: string, duration: number, attempt: number): void {
		// TODO: Integrate with PerformanceMonitoringService
		console.log(`[ErrorHandlingService] Success metrics: ${operationName}, ${duration}ms, attempt ${attempt}`);
	}
	
	/**
	 * Track operation failure metrics
	 */
	private trackOperationFailure(operationName: string, error: Error, attempt: number): void {
		// TODO: Integrate with PerformanceMonitoringService
		console.log(`[ErrorHandlingService] Failure metrics: ${operationName}, attempt ${attempt}, error: ${error.message}`);
	}
	
	/**
	 * Track circuit breaker events
	 */
	private trackCircuitBreakerEvent(operationName: string, eventType: string): void {
		// TODO: Integrate with PerformanceMonitoringService
		console.log(`[ErrorHandlingService] Circuit breaker event: ${operationName}, ${eventType}`);
    
    /**
     * Delay execution
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Get circuit breaker status
     */
    getCircuitBreakerStatus(serviceName: string): CircuitBreakerState | undefined {
        return this.circuitBreakers.get(serviceName);
    }
    
    /**
     * Get all circuit breaker statuses
     */
    getAllCircuitBreakerStatuses(): CircuitBreakerState[] {
        return Array.from(this.circuitBreakers.values());
    }
    
    /**
     * Reset circuit breaker
     */
    resetCircuitBreaker(serviceName: string): void {
        if (this.circuitBreakers.has(serviceName)) {
            this.circuitBreakers.delete(serviceName);
            console.log(`[ErrorHandlingService] Circuit breaker reset for ${serviceName}`);
        }
    }
    
    /**
     * Update configuration
     */
    updateConfiguration(newConfig: Partial<ErrorHandlingConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log("[ErrorHandlingService] Configuration updated");
    }
    
    /**
     * Get service statistics
     */
    getStatistics(): {
        totalCircuitBreakers: number;
        openCircuitBreakers: number;
        halfOpenCircuitBreakers: number;
        closedCircuitBreakers: number;
        config: ErrorHandlingConfig;
    } {
        const states = this.getAllCircuitBreakerStatuses();
        
        return {
            totalCircuitBreakers: states.length,
            openCircuitBreakers: states.filter(s => s.state === 'OPEN').length,
            halfOpenCircuitBreakers: states.filter(s => s.state === 'HALF_OPEN').length,
            closedCircuitBreakers: states.filter(s => s.state === 'CLOSED').length,
            config: this.config
        };
    }
}

/**
 * Service layer for ErrorHandlingService
 */
export const ErrorHandlingServiceLayer = Layer.effect(
    "ErrorHandlingService",
    Effect.sync(() => new ErrorHandlingService())
);

/**
 * Live implementation
 */
export const ErrorHandlingServiceLive = Layer.effect(
    "ErrorHandlingService",
    Effect.sync(() => new ErrorHandlingService())
);
