/**
 * @module GRPCServerService
 * @description
 * Cocoon's gRPC server implementation for Mountain integration.
 * Implements the CocoonService protocol defined in Mountain's Vine.proto.
 * Provides bidirectional streaming for real-time event communication.
 *
 * RESPONSIBILITIES:
 * - Start and manage gRPC server for receiving Mountain requests
 * - Implement bidirectional streaming for real-time events
 * - Handle Mountain requests and route to appropriate services
 * - Send and receive notifications from Mountain
 * - Implement request cancellation with timeout handling
 * - Handle authentication and authorization tokens
 * - Manage connection keepalive for reliability
 * - Monitor server health and track errors
 *
 * Based on Mountain's Vine gRPC protocol specification.
 * Specification: MOUNTAIN-COCOON-INTEGRATION.md (gRPC Server Implementation)
 */
import { Layer } from "effect";
import { EventEmitter } from "events";
import { IGRPCServerService } from "../Interfaces/IGRPCServerService";
/**
 * GRPCServerService implementation with bidirectional streaming support
 */
export declare class GRPCServerService extends EventEmitter implements IGRPCServerService {
    readonly _serviceBrand: undefined;
    private server;
    private port;
    private isRunning;
    private serviceImplementation;
    private streamingHandlers;
    private authToken;
    private authEnabled;
    private readonly keepaliveInterval;
    private readonly keepaliveTimeout;
    private keepaliveTimer;
    private activeRequests;
    private readonly startTime;
    private errorCount;
    private requestCount;
    constructor();
    /**
     * Parse environment variables for configuration
     */
    private parseEnvironment;
    /**
     * Validate authentication token
     */
    private ValidateAuthentication;
    /**
     * Create gRPC service implementation with bidirectional streaming support
     */
    private createServiceImplementation;
    /**
     * Start bidirectional streaming for real-time events
     * TODO: FUTURE: Implement streaming handlers for real-time event communication
     * Specification: MOUNTAIN-COCOON-INTEGRATION.md (Bidirectional Streaming)
     * Implementation: Add stream handlers for Mountain-Cocoon event stream
     * Dependencies: Event marshaling, backpressure handling
     * Validation: Test with high-frequency event streams
     */
    private startBidirectionalStreaming;
    /**
     * Handle streaming request
     */
    private handleStreamingRequest;
    /**
     * Start keepalive for streaming connection
     */
    private startKeepalive;
    /**
     * Broadcast event to all active streaming connections
     */
    private BroadcastEvent;
    /**
     * Handle Mountain request with validation and routing
     */
    private handleMountainRequest;
    /**
     * Validate request method format
     */
    private IsValidMethod;
    /**
     * Serialize response data to buffer
     */
    private SerializeResponseData;
    /**
     * Parse parameters from JSON with enhanced error handling
     */
    private parseParameters;
    /**
     * Route request to appropriate service
     * Service mapping and request routing is fully implemented
     */
    private routeRequest;
    /**
     * Handle Mountain notification with event emission
     */
    private handleMountainNotification;
    /**
     * Handle specific notification types
     */
    private handleSpecificNotification;
    /**
     * Handle cancel operation with request tracking
     */
    private handleCancelOperation;
    /**
     * Register cancel handler for a request
     * TODO: FUTURE: Integrate with Cancellation service for enhanced cancellation support
     * Specification: MOUNTAIN-OPERATIONS.md (Cancellation Semantics)
     * Implementation: Proper cancellation propagation across service boundaries
     * Dependencies: CancellationService, operation context
     * Validation: Test with nested and parallel operations
     */
    private registerCancelHandler;
    /**
     * Start gRPC server
     */
    start(): Promise<void>;
    /**
     * Load protocol definition from Mountain's Vine.proto with fallback support
     * Protocol loading is fully implemented with multiple search paths and fallback
     */
    private loadProtocolDefinition;
    private startServer;
    /**
     * Stop gRPC server
     */
    stop(): Promise<void>;
    /**
     * Get server status with detailed metrics
     */
    getStatus(): {
        running: boolean;
        port: number;
        uptime?: number;
        errorCount: number;
        requestCount: number;
        activeConnections: number;
        authEnabled: boolean;
    };
    /**
     * Add event listener for notifications
     */
    onNotification(callback: (method: string, parameters: any) => void): void;
}
/**
 * Service layer for GRPCServerService
 */
export declare const GRPCServerServiceLayer: Layer.Layer<unknown, never, never>;
/**
 * Live implementation
 */
export declare const GRPCServerServiceLive: Layer.Layer<unknown, never, never>;
//# sourceMappingURL=GRPCServerService.d.ts.map