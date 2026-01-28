/**
 * @module MountainClientService
 * @description
 * Cocoon's gRPC client implementation for Mountain integration.
 * Connects to Mountain's gRPC server and implements MountainService client.
 * 
 * Based on Mountain's Vine gRPC protocol specification.
 * Specification: MOUNTAIN-COCOON-INTEGRATION.md (Mountain Client Implementation)
 */

import { Effect, Layer } from "effect";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { IMountainClientService } from "../Interfaces/IMountainClientService";

// gRPC service definitions from Mountain's Vine protocol
interface GenericRequest {
    RequestIdentifier: number;
    Method: string;
    Parameter: Buffer;
}

interface GenericResponse {
    RequestIdentifier: number;
    Success: boolean;
    Data?: Buffer;
    Error?: string;
}

interface GenericNotification {
    Method: string;
    Parameter: Buffer;
}

interface CancelOperationRequest {
    RequestIdentifier: number;
    Reason: string;
}

interface Empty {}

// gRPC client types
type MountainServiceClient = {
    ProcessCocoonRequest: grpc.ClientUnaryCall<GenericRequest, GenericResponse>;
    SendCocoonNotification: grpc.ClientUnaryCall<GenericNotification, Empty>;
    CancelOperation: grpc.ClientUnaryCall<CancelOperationRequest, Empty>;
};

/**
 * MountainClientService implementation
 */
export class MountainClientService implements IMountainClientService {
    private readonly _serviceBrand: undefined;
    
    private client: grpc.Client | null = null;
    private mountainHost: string = 'localhost';
    private mountainPort: number = 50051; // Default Mountain gRPC port
    private isConnected: boolean = false;
    private connectionStartTime: number = 0;
    private errorCount: number = 0;
    private requestCounter: number = 0;
    
    constructor() {
        console.log("[MountainClientService] Initializing Mountain gRPC client");
        
        // Parse environment variables
        this.parseEnvironment();
        
        console.log(`[MountainClientService] Configured for ${this.mountainHost}:${this.mountainPort}`);
    }
    
    /**
     * Parse environment variables for configuration
     */
    private parseEnvironment(): void {
        const mountainHost = process.env.MOUNTAIN_CONNECTION_HOST;
        const mountainPort = process.env.MOUNTAIN_GRPC_PORT;
        
        if (mountainHost) {
            this.mountainHost = mountainHost;
        }
        
        if (mountainPort) {
            this.mountainPort = parseInt(mountainPort, 10);
        }
        
        console.log(`[MountainClientService] Environment parsed: MOUNTAIN_CONNECTION_HOST=${this.mountainHost}, MOUNTAIN_GRPC_PORT=${this.mountainPort}`);
    }
    
    /**
     * Connect to Mountain gRPC server
     */
    async connect(): Promise<void> {
        if (this.isConnected) {
            console.warn("[MountainClientService] Already connected to Mountain");
            return;
        }
        
        console.log(`[MountainClientService] Connecting to Mountain at ${this.mountainHost}:${this.mountainPort}`);
        
        try {
            // Load protocol definition
            const packageDefinition = await this.loadProtocolDefinition();
            const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
            
            // Create gRPC client
            const target = `${this.mountainHost}:${this.mountainPort}`;
            this.client = new protoDescriptor.MountainService(
                target,
                grpc.credentials.createInsecure(),
                {
                    'grpc.max_receive_message_length': 1024 * 1024 * 100, // 100MB
                    'grpc.max_send_message_length': 1024 * 1024 * 100,      // 100MB
                }
            );
            
            // Wait for connection to be established
            await this.waitForConnection();
            
            this.isConnected = true;
            this.connectionStartTime = Date.now();
            this.errorCount = 0;
            
            console.log("[MountainClientService] Successfully connected to Mountain");
            
        } catch (error) {
            this.errorCount++;
            console.error("[MountainClientService] Failed to connect to Mountain:", error);
            throw error;
        }
    }
    
    /**
     * Load protocol definition
     */
    private async loadProtocolDefinition(): Promise<protoLoader.PackageDefinition> {
        // TODO: Load Vine.proto from Mountain's protocol definitions
        // Specification: MOUNTAIN-COCOON-INTEGRATION.md (Protocol Loading)
        // Implementation: Load protobuf definition from Mountain's source
        // Dependencies: Protocol buffer compilation, path resolution
        // Validation: Test with actual Mountain Vine.proto file
        
        // Mock implementation - would load actual Vine.proto
        const protoContent = `
            syntax = "proto3";
            
            service MountainService {
                rpc ProcessCocoonRequest(GenericRequest) returns (GenericResponse);
                rpc SendCocoonNotification(GenericNotification) returns (Empty);
                rpc CancelOperation(CancelOperationRequest) returns (Empty);
            }
            
            message GenericRequest {
                uint64 RequestIdentifier = 1;
                string Method = 2;
                bytes Parameter = 3;
            }
            
            message GenericResponse {
                uint64 RequestIdentifier = 1;
                bool Success = 2;
                bytes Data = 3;
                string Error = 4;
            }
            
            message GenericNotification {
                string Method = 1;
                bytes Parameter = 2;
            }
            
            message CancelOperationRequest {
                uint64 RequestIdentifier = 1;
                string Reason = 2;
            }
            
            message Empty {}
        `;
        
        return protoLoader.loadSync(
            'vine.proto',
            {
                keepCase: true,
                longs: String,
                enums: String,
                defaults: true,
                oneofs: true
            }
        );
    }
    
    /**
     * Wait for connection to be established
     */
    private waitForConnection(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.client) {
                reject(new Error('Client not initialized'));
                return;
            }
            
            const deadline = new Date();
            deadline.setSeconds(deadline.getSeconds() + 10); // 10 second timeout
            
            this.client.waitForReady(deadline, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
    
    /**
     * Send request to Mountain
     */
    async sendRequest(method: string, parameters: any): Promise<any> {
        if (!this.isConnected || !this.client) {
            throw new Error('Not connected to Mountain');
        }
        
        const requestIdentifier = this.generateRequestId();
        console.log(`[MountainClientService] Sending request to Mountain: ${method}, ID: ${requestIdentifier}`);
        
        try {
            const request: GenericRequest = {
                RequestIdentifier: requestIdentifier,
                Method: method,
                Parameter: Buffer.from(JSON.stringify(parameters))
            };
            
            const response = await this.makeRequest(request);
            
            if (!response.Success) {
                throw new Error(response.Error || 'Mountain request failed');
            }
            
            // Parse response data
            const responseData = response.Data 
                ? JSON.parse(response.Data.toString('utf8'))
                : {};
            
            console.log(`[MountainClientService] Request ${method} completed successfully`);
            
            return responseData;
            
        } catch (error) {
            this.errorCount++;
            console.error(`[MountainClientService] Request ${method} failed:`, error);
            throw error;
        }
    }
    
    /**
     * Make gRPC request with promise interface
     */
    private makeRequest(request: GenericRequest): Promise<GenericResponse> {
        return new Promise((resolve, reject) => {
            if (!this.client) {
                reject(new Error('Client not initialized'));
                return;
            }
            
            this.client.ProcessCocoonRequest(request, (error, response) => {
                if (error) {
                    reject(error);
                } else if (!response) {
                    reject(new Error('Empty response from Mountain'));
                } else {
                    resolve(response);
                }
            });
        });
    }
    
    /**
     * Send notification to Mountain
     */
    async sendNotification(method: string, parameters: any): Promise<void> {
        if (!this.isConnected || !this.client) {
            throw new Error('Not connected to Mountain');
        }
        
        console.log(`[MountainClientService] Sending notification to Mountain: ${method}`);
        
        try {
            const notification: GenericNotification = {
                Method: method,
                Parameter: Buffer.from(JSON.stringify(parameters))
            };
            
            await this.makeNotification(notification);
            
            console.log(`[MountainClientService] Notification ${method} sent successfully`);
            
        } catch (error) {
            this.errorCount++;
            console.error(`[MountainClientService] Notification ${method} failed:`, error);
            throw error;
        }
    }
    
    /**
     * Make gRPC notification with promise interface
     */
    private makeNotification(notification: GenericNotification): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.client) {
                reject(new Error('Client not initialized'));
                return;
            }
            
            this.client.SendCocoonNotification(notification, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
    
    /**
     * Cancel operation
     */
    async cancelOperation(requestIdentifier: number, reason: string): Promise<void> {
        if (!this.isConnected || !this.client) {
            throw new Error('Not connected to Mountain');
        }
        
        console.log(`[MountainClientService] Canceling operation: ${requestIdentifier}, reason: ${reason}`);
        
        try {
            const cancelRequest: CancelOperationRequest = {
                RequestIdentifier: requestIdentifier,
                Reason: reason
            };
            
            await this.makeCancelRequest(cancelRequest);
            
            console.log(`[MountainClientService] Operation ${requestIdentifier} canceled`);
            
        } catch (error) {
            this.errorCount++;
            console.error(`[MountainClientService] Cancel operation ${requestIdentifier} failed:`, error);
            throw error;
        }
    }
    
    /**
     * Make gRPC cancel request with promise interface
     */
    private makeCancelRequest(cancelRequest: CancelOperationRequest): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.client) {
                reject(new Error('Client not initialized'));
                return;
            }
            
            this.client.CancelOperation(cancelRequest, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
    
    /**
     * Generate unique request identifier
     */
    private generateRequestId(): number {
        return ++this.requestCounter;
    }
    
    /**
     * Disconnect from Mountain
     */
    async disconnect(): Promise<void> {
        if (!this.isConnected || !this.client) {
            console.warn("[MountainClientService] Not connected to Mountain");
            return;
        }
        
        console.log("[MountainClientService] Disconnecting from Mountain");
        
        this.client.close();
        this.client = null;
        this.isConnected = false;
        
        console.log("[MountainClientService] Disconnected from Mountain");
    }
    
    /**
     * Reconnect to Mountain
     */
    async reconnect(): Promise<void> {
        console.log("[MountainClientService] Reconnecting to Mountain");
        
        await this.disconnect();
        await this.connect();
        
        console.log("[MountainClientService] Reconnected to Mountain");
    }
    
    /**
     * Get connection status
     */
    getStatus(): {
        connected: boolean;
        mountainHost: string;
        mountainPort: number;
        errorCount: number;
        uptime?: number;
    } {
        return {
            connected: this.isConnected,
            mountainHost: this.mountainHost,
            mountainPort: this.mountainPort,
            errorCount: this.errorCount,
            uptime: this.isConnected ? Date.now() - this.connectionStartTime : undefined
        };
    }
}

/**
 * Service layer for MountainClientService
 */
export const MountainClientServiceLayer = Layer.effect(
    IMountainClientService,
    Effect.sync(() => new MountainClientService())
);

/**
 * Live implementation
 */
export const MountainClientServiceLive = Layer.effect(
    IMountainClientService,
    Effect.sync(() => new MountainClientService())
);
