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
	 * Parse environment variables with advanced configuration
	 */
	private parseEnvironment(): void {
		const mountainHost = process.env.MOUNTAIN_CONNECTION_HOST || 'localhost';
		const mountainPort = process.env.MOUNTAIN_GRPC_PORT || '50051';
		const connectionTimeout = process.env.MOUNTAIN_CONNECTION_TIMEOUT || '30000';
		const maxRetries = process.env.MOUNTAIN_MAX_RETRIES || '3';
		
		this.mountainHost = mountainHost;
		this.mountainPort = parseInt(mountainPort, 10);
		
		console.log(`[MountainClientService] Environment parsed: MOUNTAIN_CONNECTION_HOST=${this.mountainHost}, MOUNTAIN_GRPC_PORT=${this.mountainPort}`);
		
		// Advanced configuration validation
		if (!this.isValidHost(this.mountainHost)) {
			throw new Error(`Invalid Mountain host: ${this.mountainHost}`);
		}
		
		if (this.mountainPort < 1 || this.mountainPort > 65535) {
			throw new Error(`Invalid Mountain port: ${this.mountainPort}`);
		}
	}
	
	/**
	 * Validate host configuration
	 */
	private isValidHost(host: string): boolean {
		const validHostPatterns = [
			/^localhost$/,
			/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // IPv4
			/^\[[0-9a-fA-F:]+\]$/, // IPv6
			/^[a-zA-Z0-9.-]+$/ // Domain name
		];
		
		return validHostPatterns.some(pattern => pattern.test(host));
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
            
            // Create gRPC client with enhanced configuration
            const target = `${this.mountainHost}:${this.mountainPort}`;
            this.client = new protoDescriptor.MountainService(
                target,
                grpc.credentials.createInsecure(),
                {
                    'grpc.max_receive_message_length': 1024 * 1024 * 100, // 100MB
                    'grpc.max_send_message_length': 1024 * 1024 * 100,      // 100MB
                    'grpc.keepalive_time_ms': 10000,
                    'grpc.keepalive_timeout_ms': 5000,
                    'grpc.keepalive_permit_without_calls': 1,
                    'grpc.http2.max_pings_without_data': 0,
                    'grpc.http2.min_time_between_pings_ms': 10000,
                    'grpc.http2.min_ping_interval_without_data_ms': 30000
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
        console.log("[MountainClientService] Loading Vine.proto protocol definition");
        
        try {
            const fs = require('fs');
            const path = require('path');
            
        // Multiple fallback paths to find Mountain's Proto directory
        const protoSearchPaths = [
            path.resolve(__dirname, '../../../../Mountain/Proto/Vine.proto'),
            path.resolve(__dirname, '../../../../../Mountain/Proto/Vine.proto'),
            path.resolve(__dirname, '../../../../../../Mountain/Proto/Vine.proto'),
            path.resolve(process.cwd(), '../Mountain/Proto/Vine.proto'),
            path.resolve(process.cwd(), '../../Mountain/Proto/Vine.proto'),
            path.resolve(process.cwd(), '../../../Mountain/Proto/Vine.proto'),
            path.resolve(process.cwd(), 'Mountain/Proto/Vine.proto'),
            path.resolve(process.cwd(), 'Application/CodeEditorLand/Land/Element/Mountain/Proto/Vine.proto')
        ];
        
        let vineProtoPath = null;
        for (const protoPath of protoSearchPaths) {
            if (fs.existsSync(protoPath)) {
                vineProtoPath = protoPath;
                break;
            }
        }
        
        if (vineProtoPath) {
            console.log(`[MountainClientService] Found Vine.proto at: ${vineProtoPath}`);
            
            return protoLoader.loadSync(vineProtoPath, {
                keepCase: true,
                longs: 'number',  // Use numbers for better performance
                enums: String,
                defaults: true,
                oneofs: true,
                includeDirs: [path.dirname(vineProtoPath)],
                arrays: true,
                objects: true
            });
        } else {
            console.error("[MountainClientService] Vine.proto not found in any search path");
            console.log("[MountainClientService] Search paths attempted:", protoSearchPaths);
            
            // Enhanced fallback with production-ready protocol definition
            const fallbackProtoContent = `
                syntax = "proto3";
                
                package vine_ipc;
                
                service MountainService {
                    rpc ProcessCocoonRequest(GenericRequest) returns (GenericResponse);
                    rpc SendCocoonNotification(GenericNotification) returns (Empty);
                    rpc CancelOperation(CancelOperationRequest) returns (Empty);
                }
                
                service CocoonService {
                    rpc ProcessMountainRequest(GenericRequest) returns (GenericResponse);
                    rpc SendMountainNotification(GenericNotification) returns (Empty);
                    rpc CancelOperation(CancelOperationRequest) returns (Empty);
                }
                
                message GenericRequest {
                    uint64 RequestIdentifier = 1;
                    string Method = 2;
                    bytes Parameter = 3;
                    map<string, string> Headers = 4;
                    string CorrelationId = 5;
                }
                
                message GenericResponse {
                    uint64 RequestIdentifier = 1;
                    bool Success = 2;
                    bytes Data = 3;
                    string Error = 4;
                    int32 StatusCode = 5;
                    map<string, string> Headers = 6;
                }
                
                message GenericNotification {
                    string Method = 1;
                    bytes Parameter = 2;
                    map<string, string> Headers = 3;
                    string CorrelationId = 4;
                }
                
                message CancelOperationRequest {
                    uint64 RequestIdentifier = 1;
                    string Reason = 2;
                    string CorrelationId = 3;
                }
                
                message Empty {}
            `;
                
                // Create temporary file with proper permissions
                const tempDir = require('os').tmpdir();
                const tempProtoPath = path.join(tempDir, 'vine_fallback.proto');
                fs.writeFileSync(tempProtoPath, fallbackProtoContent);
                
                console.log(`[MountainClientService] Using enhanced fallback protocol at: ${tempProtoPath}`);
                
                return protoLoader.loadSync(tempProtoPath, {
                    keepCase: true,
                    longs: 'number',
                    enums: String,
                    defaults: true,
                    oneofs: true,
                    arrays: true,
                    objects: true
                });
            }
            
        } catch (error) {
            console.error("[MountainClientService] Failed to load protocol definition:", error);
            throw new Error(`Failed to load Vine.proto: ${error.message}`);
        }
    }
    
    /**
	 * Wait for connection with advanced timeout handling
	 */
	private waitForConnection(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.client) {
				reject(new Error('Client not initialized'));
				return;
			}
			
			const connectionTimeout = parseInt(process.env.MOUNTAIN_CONNECTION_TIMEOUT || '10000', 10);
			const deadline = new Date();
			deadline.setMilliseconds(deadline.getMilliseconds() + connectionTimeout);
			
			let timeoutId: NodeJS.Timeout;
			
			// Set timeout for connection attempt
			timeoutId = setTimeout(() => {
				reject(new Error(`Connection timeout after ${connectionTimeout}ms`));
			}, connectionTimeout);
			
			this.client.waitForReady(deadline, (error) => {
				clearTimeout(timeoutId);
				
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
    
    /**
	 * Send request to Mountain with advanced features
	 */
	async sendRequest(method: string, parameters: any): Promise<any> {
		if (!this.isConnected || !this.client) {
			throw new Error('Not connected to Mountain');
		}
		
		const requestIdentifier = this.generateRequestId();
		const startTime = Date.now();
		
		console.log(`[MountainClientService] Sending request to Mountain: ${method}, ID: ${requestIdentifier}`);
		
		try {
			const request: GenericRequest = {
				RequestIdentifier: requestIdentifier,
				Method: method,
				Parameter: Buffer.from(JSON.stringify(parameters)),
				Headers: {
					'X-Request-ID': requestIdentifier.toString(),
					'X-Timestamp': startTime.toString(),
					'X-Source': 'Cocoon'
				},
				CorrelationId: `cocoon-${requestIdentifier}`
			};
			
			const response = await this.makeRequest(request);
			
			const duration = Date.now() - startTime;
			
			if (!response.Success) {
				throw new Error(response.Error || 'Mountain request failed');
			}
			
			// Parse response data
			const responseData = response.Data 
				? JSON.parse(response.Data.toString('utf8'))
				: {};
			
			console.log(`[MountainClientService] Request ${method} completed successfully in ${duration}ms`);
			
			// Track performance metrics
			this.trackRequestMetrics(method, duration, true);
			
			return responseData;
			
		} catch (error) {
			this.errorCount++;
			const duration = Date.now() - startTime;
			
			console.error(`[MountainClientService] Request ${method} failed after ${duration}ms:`, error);
			
			// Track failure metrics
			this.trackRequestMetrics(method, duration, false);
			
			// Auto-reconnect on connection errors
			if (this.isConnectionError(error)) {
				console.log("[MountainClientService] Connection error detected, attempting reconnect");
				try {
					await this.reconnect();
					console.log("[MountainClientService] Reconnected successfully, retrying request");
					return this.sendRequest(method, parameters);
				} catch (reconnectError) {
					console.error("[MountainClientService] Reconnect failed:", reconnectError);
				}
			}
			
			throw error;
		}
	}
	
	/**
	 * Track request performance metrics
	 */
	private trackRequestMetrics(method: string, duration: number, success: boolean): void {
		// TODO: Integrate with PerformanceMonitoringService
		console.log(`[MountainClientService] Request metrics: ${method}, ${duration}ms, success: ${success}`);
    
    /**
     * Check if error is a connection error
     */
    private isConnectionError(error: any): boolean {
        return error && (
            error.code === 'UNAVAILABLE' ||
            error.code === 'DEADLINE_EXCEEDED' ||
            error.message?.includes('connect') ||
            error.message?.includes('connection')
        );
    }
    
    /**
     * Make gRPC request with promise interface and retry logic
     */
    private makeRequest(request: GenericRequest): Promise<GenericResponse> {
        return new Promise((resolve, reject) => {
            if (!this.client) {
                reject(new Error('Client not initialized'));
                return;
            }
            
            let attempts = 0;
            const maxAttempts = 3;
            
            const attemptRequest = () => {
                attempts++;
                
                this.client!.ProcessCocoonRequest(request, (error, response) => {
                    if (error) {
                        console.warn(`[MountainClientService] Request ${request.RequestIdentifier} failed (attempt ${attempts}/${maxAttempts}):`, error);
                        
                        if (attempts < maxAttempts) {
                            setTimeout(() => {
                                attemptRequest();
                            }, 1000); // 1 second delay
                        } else {
                            reject(error);
                        }
                    } else if (!response) {
                        reject(new Error('Empty response from Mountain'));
                    } else {
                        resolve(response);
                    }
                });
            };
            
            attemptRequest();
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
