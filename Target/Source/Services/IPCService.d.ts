/**
 * @module IPCService
 * @description
 * Advanced IPC service implementation following VS Code's IPC patterns.
 * Based on VS Code's IPCServer/IPCClient architecture with channels.
 *
 * Architecture Specification: VS Code IPC Pattern Implementation
 * Implementation: Channel-based RPC with cancellation support
 * Validation: Test with high-concurrency message handling (>1000 req/sec)
 */
import { Layer } from "effect";
import { IIPCService, IChannel, IServerChannel, IMessagePassingProtocol, VSBuffer } from "../Interfaces/IIPCService";
/**
 * Message passing protocol implementation
 * Specification: src/vs/base/parts/ipc/common/ipc.ts (IMessagePassingProtocol)
 * Implementation: Binary-safe message serialization
 */
declare class CocoonMessagePassingProtocol implements IMessagePassingProtocol {
    private _sendCallback?;
    private readonly _onMessage;
    readonly onMessage: any;
    constructor(_sendCallback?: (buffer: VSBuffer) => void);
    send(buffer: VSBuffer): void;
    simulateMessage(buffer: VSBuffer): void;
}
/**
 * Advanced IPC service implementation
 * Specification: src/vs/base/parts/ipc/common/ipc.ts (IPCServer/IPCClient)
 * Implementation: Multi-channel RPC system with cancellation
 */
export declare class IPCService implements IIPCService {
    readonly _serviceBrand: undefined;
    private _protocol;
    private _channels;
    private _isConnected;
    private _connectionStartTime;
    private _messageCount;
    private _errorCount;
    private _lastPing;
    private _latencySamples;
    private _channelClient;
    constructor();
    /**
     * Initialize IPC service with protocol
     */
    initialize(protocol: IMessagePassingProtocol): Promise<void>;
    /**
     * Establish connection with Mountain
     */
    private _establishConnection;
    /**
     * Get channel for specific service
     */
    getChannel<T extends IChannel>(channelName: string): T;
    /**
     * Register server channel for handling requests
     */
    registerChannel(channelName: string, channel: IServerChannel<any>): void;
    /**
     * Wait for response with cancellation support
     */
    private _waitForResponse;
    /**
     * Handle incoming messages
     */
    private _handleMessage;
    /**
     * Handle incoming call requests
     */
    private _handleCall;
    /**
     * Get connection status
     */
    getConnectionStatus(): any;
    /**
     * Reconnect to Mountain
     */
    reconnect(): Promise<void>;
    /**
     * Cleanup IPC service
     */
    dispose(): void;
}
/**
 * Service layer for IPCService
 */
export declare const IPCServiceLayer: Layer.Layer<unknown, never, never>;
/**
 * Live implementation
 */
export { CocoonMessagePassingProtocol };
export declare const IPCServiceLive: Layer.Layer<unknown, never, never>;
//# sourceMappingURL=IPCService.d.ts.map