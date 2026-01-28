/**
 * @module IIPCService
 * @description
 * Interface for IPC communication with Mountain via gRPC.
 * Based on Mountain's WindAdvancedSync patterns.
 */

import { Context } from "effect";

// Types matching Mountain's patterns
export interface IPCMessage {
    command: string;
    args: any[];
    target: string;
    timestamp: number;
    messageId: string;
}

export interface IPCResponse {
    success: boolean;
    data?: any;
    error?: string;
    messageId: string;
}

export interface IPCConnectionStatus {
    connected: boolean;
    lastPing?: number;
    errorCount: number;
    connectionUptime: number;
}

export interface IIPCService {
    readonly _serviceBrand: undefined;
    
    /**
     * Initialize IPC service
     */
    initialize(): Promise<void>;
    
    /**
     * Send message to Mountain
     */
    send(command: string, data: any): Promise<IPCResponse>;
    
    /**
     * Listen for messages from Mountain
     */
    listen(event: string, callback: (data: any) => void): Promise<void>;
    
    /**
     * Get connection status
     */
    getConnectionStatus(): IPCConnectionStatus;
    
    /**
     * Cleanup IPC service
     */
    cleanup?(): Promise<void>;
    
    /**
     * Reconnect to Mountain
     */
    reconnect(): Promise<void>;
}

/**
 * Effect context for IPCService
 */
export const IIPCService = Context.GenericTag<IIPCService>("IIPCService");
