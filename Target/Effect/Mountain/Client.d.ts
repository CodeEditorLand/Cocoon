/**
 * @module Effect/MountainClient
 * @description
 * Mountain client service managing the gRPC client for Cocoon → Mountain communication.
 */
export type ConnectionState = {
    readonly _tag: "Disconnected";
} | {
    readonly _tag: "Connecting";
    readonly attempt: number;
} | {
    readonly _tag: "Connected";
    readonly serverVersion: string;
    readonly connectedAt: number;
} | {
    readonly _tag: "Disconnecting";
} | {
    readonly _tag: "Error";
    readonly error: string;
};
export interface ClientConfig {
    readonly host: string;
    readonly port: number;
    readonly timeout?: number;
    readonly maxRetries?: number;
    readonly retryDelay?: number;
    readonly enableCompression?: boolean;
    readonly enableMetrics?: boolean;
}
export interface ClientMetrics {
    readonly totalRequests: number;
    readonly successfulRequests: number;
    readonly failedRequests: number;
    readonly averageLatency: number;
    readonly lastRequestTime: number;
}
export interface RPCResponse<T = unknown> {
    readonly success: boolean;
    readonly data: T;
    readonly error?: string;
}
export declare class ConnectionError extends Error {
    readonly message: string;
    readonly cause?: unknown | undefined;
    readonly _tag = "ConnectionError";
    constructor(message: string, cause?: unknown | undefined);
}
export declare class RPCError extends Error {
    readonly method: string;
    readonly message: string;
    readonly cause?: unknown | undefined;
    readonly _tag = "RPCError";
    constructor(method: string, message: string, cause?: unknown | undefined);
}
export declare class DisconnectionError extends Error {
    readonly message: string;
    readonly cause?: unknown | undefined;
    readonly _tag = "DisconnectionError";
    constructor(message: string, cause?: unknown | undefined);
}
export interface MountainClientService {
    /** Connection state */
    readonly connectionState: () => Promise<ConnectionState>;
    /** State change stream */
    readonly connectionChanges: () => Promise<ReadonlyArray<ConnectionState>>;
    /** Connect to Mountain */
    readonly connect: (config?: ClientConfig) => Promise<void>;
    /** Disconnect from Mountain */
    readonly disconnect: () => Promise<void>;
    /** Execute RPC method */
    readonly rpc: <T>(method: string) => (params?: Record<string, unknown>) => Promise<T>;
    /** Get Mountain version */
    readonly version: () => Promise<string>;
    /** Health check */
    readonly healthCheck: () => Promise<boolean>;
    /** Client metrics */
    readonly getMetrics: () => Promise<ClientMetrics>;
}
export declare const MountainClientTag: {
    readonly _tag: "Cocoon/MountainClient";
};
export declare const MountainClient: {
    readonly _tag: "Cocoon/MountainClient";
};
export declare function getMountainClient(): Promise<MountainClientService>;
export declare const MountainClientLive: typeof getMountainClient;
export declare const makeMockMountainClient: () => MountainClientService;
export declare const MountainClientMock: MountainClientService;
//# sourceMappingURL=Client.d.ts.map