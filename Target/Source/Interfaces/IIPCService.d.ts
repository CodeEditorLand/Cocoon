/**
 * @module IIPCService
 * @description
 * Advanced IPC communication interface following VS Code IPC patterns.
 * Based on VS Code's IChannel/IServerChannel architecture.
 *
 * Architecture Specification: VSCode IPC Pattern Implementation
 * Implementation: Channel-based RPC with cancellation support
 * Dependencies: Effect-TS, VS Buffer serialization
 * Validation: Test with high-concurrency message handling
 */
import { CancellationToken } from "@codeeditorland/output/vs/base/common/cancellation";
/**
 * IPC Channel interface following VS Code's IChannel pattern
 * Specification: src/vs/base/parts/ipc/common/ipc.ts (IChannel)
 * Implementation: Promise-based RPC with cancellation support
 */
export interface IChannel {
    call<T>(command: string, arg?: any, cancellationToken?: CancellationToken): Promise<T>;
    listen<T>(event: string, arg?: any): Event<T>;
}
/**
 * Server Channel interface for handling remote calls
 * Specification: src/vs/base/parts/ipc/common/ipc.ts (IServerChannel)
 * Implementation: Context-aware request handling
 */
export interface IServerChannel<TContext = string> {
    call<T>(ctx: TContext, command: string, arg?: any, cancellationToken?: CancellationToken): Promise<T>;
    listen<T>(ctx: TContext, event: string, arg?: any): Event<T>;
}
/**
 * IPC Protocol interface for message passing
 * Specification: src/vs/base/parts/ipc/common/ipc.ts (IMessagePassingProtocol)
 * Implementation: Binary-safe message serialization
 */
export interface IMessagePassingProtocol {
    send(buffer: VSBuffer): void;
    readonly onMessage: Event<VSBuffer>;
}
/**
 * VS Buffer for binary-safe IPC communication
 * Specification: src/vs/base/parts/ipc/common/ipc.ts (VSBuffer)
 * Implementation: Binary serialization wrapper
 */
export interface VSBuffer {
    readonly buffer: Uint8Array;
    readonly byteLength: number;
    toString(): string;
    slice(start?: number, end?: number): VSBuffer;
}
/**
 * IPC Connection status with detailed metrics
 * Specification: src/vs/base/parts/ipc/common/ipc.ts (Connection monitoring)
 * Implementation: Connection health tracking
 */
export interface IPCConnectionStatus {
    connected: boolean;
    lastPing?: number;
    errorCount: number;
    connectionUptime: number;
    messageCount: number;
    averageLatency?: number;
}
/**
 * IPC Service interface following VS Code's MainProcessService pattern
 * Specification: src/vs/platform/ipc/common/mainProcessService.ts
 * Implementation: Multi-channel RPC system
 */
export interface IIPCService {
    readonly _serviceBrand: undefined;
    /**
     * Get channel for specific service
     * Specification: VS Code's getChannel pattern
     * Implementation: Channel factory with routing
     */
    getChannel<T extends IChannel>(channelName: string): T;
    /**
     * Register server channel for handling requests
     * Specification: VS Code's registerChannel pattern
     * Implementation: Channel registration with context
     */
    registerChannel(channelName: string, channel: IServerChannel<any>): void;
    /**
     * Initialize IPC service with protocol
     * Specification: IPC server/client initialization
     * Implementation: Protocol binding and connection setup
     */
    initialize(protocol: IMessagePassingProtocol): Promise<void>;
    /**
     * Get connection status
     * Specification: Connection monitoring interface
     * Implementation: Real-time metrics collection
     */
    getConnectionStatus(): IPCConnectionStatus;
    /**
     * Reconnect to Mountain
     * Specification: Connection recovery pattern
     * Implementation: Graceful reconnection with state preservation
     */
    reconnect(): Promise<void>;
    /**
     * Cleanup IPC service
     * Specification: Disposable pattern implementation
     * Implementation: Resource cleanup and connection termination
     */
    dispose(): void;
}
/**
 * Effect context for IPCService
 */
export declare const IIPCService: any;
//# sourceMappingURL=IIPCService.d.ts.map