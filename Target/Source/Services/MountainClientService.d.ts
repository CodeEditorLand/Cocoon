/**
 * @module MountainClientService
 * @description
 * Cocoon's gRPC client implementation for Mountain integration.
 * Provides bidirectional communication with Mountain's gRPC server using the Vine protocol.
 *
 * RESPONSIBILITIES:
 * - Establish and maintain gRPC connection to Mountain backend with proper channel management
 * - Send requests and notifications to Mountain with Vine protocol serialization
 * - Implement comprehensive circuit breaker pattern with exponential backoff retry logic
 * - Monitor connection health with proactive health checks and auto-reconnection
 * - Cancel long-running operations with proper request identifier tracking
 * - Track request/response metrics for observability and performance monitoring
 * - Implement defensive coding practices with comprehensive error handling
 * - Support VS Code extension patterns and cancellation tokens
 *
 * Based on Mountain's Vine gRPC protocol specification.
 * Specification: MOUNTAIN-COCOON-INTEGRATION.md (Mountain Client Implementation)
 * Protocol: /Element/Mountain/Proto/Vine.proto
 * Generated Types: /Element/Cocoon/Source/Generated/Vine.ts
 */
import { Layer } from "effect";
import { IMountainClientService } from "../Interfaces/IMountainClientService";
/**
 * Request cancellation token interface for VS Code compatibility
 */
interface CancellationToken {
    readonly isCancellationRequested: boolean;
    onCancellationRequested?: () => void;
}
/**
 * MountainClientService implementation with comprehensive fault tolerance,
 * health monitoring, and VS Code extension compatibility
 */
export declare class MountainClientService implements IMountainClientService {
    readonly _serviceBrand: undefined;
    private client;
    private channel;
    private mountainHost;
    private mountainPort;
    private connectionState;
    private connectionStartTime;
    private errorCount;
    private requestCounter;
    private activeRequests;
    private circuitBreakerState;
    private circuitBreakerFailureCount;
    private circuitBreakerSuccessCount;
    private readonly circuitBreakerThreshold;
    private readonly circuitBreakerSuccessThreshold;
    private readonly circuitBreakerTimeout;
    private circuitBreakerOpenTime;
    private circuitBreakerHalfOpenAttempts;
    private readonly maxRetries;
    private readonly baseRetryDelay;
    private readonly maxRetryDelay;
    private readonly retryJitterFactor;
    private healthCheckInterval;
    private readonly healthCheckPeriod;
    private lastHealthCheck;
    private consecutiveSuccessfulHealthChecks;
    private healthCheckFailures;
    private lastHealthCheckError;
    private totalRequests;
    private totalFailures;
    private totalSuccesses;
    private averageResponseTime;
    private maxResponseTime;
    private minResponseTime;
    private clientVersion;
    private clientId;
    private sessionId;
    constructor();
    /**
     * Parse environment variables with comprehensive configuration validation
     */
    private parseEnvironment;
    /**
     * Validate host configuration with comprehensive pattern matching
     */
    private isValidHost;
    /**
     * Register graceful shutdown handlers for VS Code extension compatibility
     */
    private registerShutdownHandlers;
    /**
     * Connect to Mountain gRPC server with comprehensive circuit breaker protection
     * and proper gRPC channel management
     */
    connect(): Promise<void>;
    /**
     * Load protocol definition with comprehensive error handling and fallback strategies
     */
    private loadProtocolDefinition;
    /**
     * Wait for connection with comprehensive timeout and readiness checking
     */
    private waitForConnection;
    /**
     * Send request to Mountain with comprehensive circuit breaker, retry logic,
     * cancellation support, and VS Code extension compatibility
     */
    sendRequest(method: string, parameters: any, cancellationToken?: CancellationToken): Promise<any>;
    /**
     * Track comprehensive request performance metrics for observability
     */
    private trackRequestMetrics;
    /**
     * Check if error is a connection error with comprehensive pattern matching
     */
    private isConnectionError;
    /**
     * Send request with exponential backoff retry logic
     */
    private SendRequestWithRetry;
    /**
     * Calculate retry delay with exponential backoff
     */
    private CalculateRetryDelay;
    /**
     * Check if error is transient and should be retried
     */
    private isTransientError;
    /**
     * Serialize parameters to buffer with validation
     */
    private SerializeParameters;
    /**
     * Deserialize response buffer with error handling
     */
    private DeserializeResponse;
    /**
     * Update circuit breaker state based on operation result
     */
    private UpdateCircuitBreaker;
    /**
     * Check circuit breaker state and throw if open
     */
    private CheckCircuitBreaker;
    /**
     * Start health monitoring
     */
    private startHealthMonitoring;
    /**
     * Stop health monitoring
     */
    private stopHealthMonitoring;
    /**
     * Perform health check
     */
    private performHealthCheck;
    /**
     * Send notification to Mountain
     */
    sendNotification(method: string, parameters: any): Promise<void>;
    /**
     * Make gRPC notification with promise interface
     */
    private makeNotification;
    /**
     * Cancel operation
     */
    cancelOperation(requestIdentifier: number, reason: string): Promise<void>;
    /**
     * Make gRPC cancel request with promise interface
     */
    private makeCancelRequest;
    /**
     * Generate unique request identifier
     */
    private generateRequestId;
    /**
     * Disconnect from Mountain
     */
    disconnect(): Promise<void>;
    /**
     * Reconnect to Mountain
     */
    reconnect(): Promise<void>;
    /**
     * Get connection status with circuit breaker information
     */
    getStatus(): {
        connected: boolean;
        mountainHost: string;
        mountainPort: number;
        errorCount: number;
        uptime?: number;
        circuitBreakerState: string;
        circuitBreakerFailureCount: number;
        lastHealthCheck?: Date;
    };
}
/**
 * Service layer for MountainClientService
 */
export declare const MountainClientServiceLayer: Layer.Layer<IMountainClientService, never, never>;
export {};
//# sourceMappingURL=MountainClientService.d.ts.map