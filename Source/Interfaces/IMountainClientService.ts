/**
 * @module IMountainClientService
 * @description
 * Interface for Cocoon's Mountain gRPC client service.
 * Responsible for communicating with Mountain via gRPC.
 * 
 * Based on Mountain's Vine protocol specification.
 */

import { Context } from "effect";

export interface IMountainClientService {
    readonly _serviceBrand: undefined;
    
    /**
     * Connect to Mountain gRPC server
     */
    connect(): Promise<void>;
    
    /**
     * Disconnect from Mountain
     */
    disconnect(): Promise<void>;
    
    /**
     * Reconnect to Mountain
     */
    reconnect(): Promise<void>;
    
    /**
     * Send request to Mountain
     */
    sendRequest(method: string, parameters: any): Promise<any>;
    
    /**
     * Send notification to Mountain
     */
    sendNotification(method: string, parameters: any): Promise<void>;
    
    /**
     * Cancel operation
     */
    cancelOperation(requestIdentifier: number, reason: string): Promise<void>;
    
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

export const IMountainClientService = Context.Tag<IMountainClientService>();
