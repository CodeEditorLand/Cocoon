import { IDisposable } from '../../../../../base/common/lifecycle.js';
import { SyncDescriptor0 } from '../../../../../platform/instantiation/common/descriptors.js';
export interface IMcpDiscovery extends IDisposable {
    start(): void;
}
declare class McpDiscoveryRegistry {
    private readonly _discovery;
    register(discovery: SyncDescriptor0<IMcpDiscovery>): void;
    getAll(): readonly SyncDescriptor0<IMcpDiscovery>[];
}
export declare const mcpDiscoveryRegistry: McpDiscoveryRegistry;
export {};
