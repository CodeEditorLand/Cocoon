/**
 * @module IGRPCServerService
 * @description
 * Interface for Cocoon's gRPC server service.
 * Responsible for handling Mountain gRPC requests and notifications.
 * 
 * Based on Mountain's Vine protocol specification.
 */

import { Context } from "effect";

export interface IGRPCServerService {
    readonly _serviceBrand: undefined;
    
    /**
     * Start the gRPC server
     */
    start(): Promise<void>;
    
    /**
     * Stop the gRPC server
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
}

export const IGRPCServerService = Context.GenericTag<IGRPCServerService>("IGRPCServerService");
