/**
 * @module MountainClient
 * @description
 * High-level Mountain client wrapper that provides a simplified interface
 * for interacting with Mountain's gRPC services.
 *
 * This client wraps the MountainClientService and provides additional
 * convenience methods for common Mountain operations.
 */
/**
 * MountainClient - High-level client for Mountain integration
 */
export declare class MountainClient {
    private clientService;
    private isInitialized;
    constructor();
    /**
     * Initialize the Mountain client
     */
    initialize(): Promise<void>;
    /**
     * Send a request to Mountain with simplified interface
     */
    request(method: string, data?: any): Promise<any>;
    /**
     * Send a notification to Mountain
     */
    notify(method: string, data?: any): Promise<void>;
    /**
     * Get client status
     */
    getStatus(): {
        connected: boolean;
        mountainHost: string;
        mountainPort: number;
        errorCount: number;
        uptime?: number;
    };
    /**
     * Check if client is connected
     */
    isConnected(): boolean;
    /**
     * Disconnect from Mountain
     */
    disconnect(): Promise<void>;
    /**
     * Reconnect to Mountain
     */
    reconnect(): Promise<void>;
    /**
     * Health check
     */
    healthCheck(): Promise<boolean>;
    /**
     * Get error count
     */
    getErrorCount(): number;
    /**
     * Reset error count
     */
    resetErrorCount(): void;
}
//# sourceMappingURL=MountainClient.d.ts.map