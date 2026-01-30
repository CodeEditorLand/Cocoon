/**
 * @module MountainClientService
 * @description
 * Cocoon's gRPC client implementation for Mountain integration.
 * Connects to Mountain's gRPC server and implements MountainService client.
 *
 * Based on Mountain's Vine gRPC protocol specification.
 * Specification: MOUNTAIN-COCOON-INTEGRATION.md (Mountain Client Implementation)
 */
import { Layer } from "effect";
import { IMountainClientService } from "../Interfaces/IMountainClientService";
export declare class MountainClientService implements IMountainClientService {
    readonly _serviceBrand: undefined;
    private client;
    private mountainHost;
    private mountainPort;
    private isConnected;
    private connectionStartTime;
    private errorCount;
    private requestCounter;
    constructor();
    /**
     * Parse environment variables with advanced configuration
     */
    private parseEnvironment;
    /**
     * Validate host configuration
     */
    private isValidHost;
    connect(): Promise<void>;
    /**
     * Load protocol definition
     */
    private loadProtocolDefinition;
    /**
     * Wait for connection with advanced timeout handling
     */
    private waitForConnection;
    /**
     * Send request to Mountain with advanced features
     */
    sendRequest(method: string, parameters: any): Promise<any>;
    /**
     * Track request performance metrics
     */
    private trackRequestMetrics;
    /**
     * Check if error is a connection error
     */
    private isConnectionError;
    /**
     * Make gRPC request with promise interface and retry logic
     */
    private makeRequest;
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
     * Get connection status
     */
    getStatus(): {
        connected: boolean;
        mountainHost: string;
        mountainPort: number;
        errorCount: number;
        uptime?: number;
    };
}
/**
 * Service layer for MountainClientService
 */
export declare const MountainClientServiceLayer: Layer.Layer<IMountainClientService, never, never>;
//# sourceMappingURL=MountainClientService.d.ts.map