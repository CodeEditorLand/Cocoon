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
/**
 * MountainClientService implementation
 */
export declare class MountainClientService implements IMountainClientService {
    private readonly _serviceBrand;
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
    /**
     * Load protocol definition
     */
    private loadProtocolDefinition;
    /**
     * Wait for connection with advanced timeout handling
     */
    private waitForConnection;
}
/**
 * Service layer for MountainClientService
 */
export declare const MountainClientServiceLayer: Layer.Layer<unknown, never, never>;
/**
 * Live implementation
 */
export declare const MountainClientServiceLive: Layer.Layer<unknown, never, never>;
//# sourceMappingURL=MountainClientService.d.ts.map