/**
 * @module GRPCServerService
 * @description
 * Cocoon's gRPC server implementation for Mountain integration.
 * Implements the CocoonService protocol defined in Mountain's Vine.proto.
 *
 * Based on Mountain's Vine gRPC protocol specification.
 * Specification: MOUNTAIN-COCOON-INTEGRATION.md (gRPC Server Implementation)
 */
import { Layer } from "effect";
import { IGRPCServerService } from "../Interfaces/IGRPCServerService";
/**
 * GRPCServerService implementation
 */
export declare class GRPCServerService implements IGRPCServerService {
    private readonly _serviceBrand;
    private server;
    private port;
    private isRunning;
    private serviceImplementation;
    constructor();
    /**
     * Parse environment variables for configuration
     */
    private parseEnvironment;
    /**
     * Create gRPC service implementation
     */
    private createServiceImplementation;
    /**
     * Handle Mountain request
     */
    private handleMountainRequest;
    /**
     * Parse parameters from JSON
     */
    private parseParameters;
    /**
     * Route request to appropriate service
     */
    private routeRequest;
    /**
     * Handle Mountain notification
     */
    private handleMountainNotification;
    /**
     * Handle cancel operation
     */
    private handleCancelOperation;
    /**
     * Start gRPC server
     */
    start(): Promise<void>;
    /**
     * Load protocol definition
     */
    private loadProtocolDefinition;
    private startServer;
    /**
     * Stop gRPC server
     */
    stop(): Promise<void>;
    /**
     * Get server status
     */
    getStatus(): {
        running: boolean;
        port: number;
        uptime?: number;
        errorCount: number;
    };
    private startTime;
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