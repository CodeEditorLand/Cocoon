/**
 * @module ConfigurationChannel
 * @description
 * Server channel implementation for configuration management.
 * Based on VS Code's ConfigurationService channel pattern.
 *
 * Responsibilities:
 * - Handle IPC channel calls for configuration operations
 * - Provide remote access to configuration service methods
 * - Validate channel arguments and responses
 * - Implement configuration change event broadcasting
 * - Handle error propagation for configuration operations
 *
 * Architecture Specification: VS Code Configuration Service Channel
 * Implementation: Configuration synchronization with Mountain
 * Validation: Test with configuration updates across scopes
 *
 * @future TODO: Implement incremental event broadcasting for large configuration changes
 * @future TODO: Add channel-specific rate limiting for configuration updates
 * @future TODO: Implement batched configuration operations for performance
 */
import { CancellationToken } from "@codeeditorland/output/vscode-dts/vscode";
import { IConfigurationService } from "../Interfaces/IConfigurationService";
import { IServerChannel } from "../Interfaces/IIPCService";
/**
 * Configuration channel implementation
 * Specification: src/vs/platform/configuration/common/configuration.ts
 * Implementation: Configuration synchronization with Mountain
 */
export declare class ConfigurationChannel implements IServerChannel<any> {
    private readonly configurationService;
    constructor(configurationService: IConfigurationService);
    /**
     * Handle configuration-related calls
     */
    call<T>(ctx: any, command: string, arg?: any, cancellationToken?: CancellationToken): Promise<T>;
    /**
     * Handle getValue call
     */
    private handleGetValue;
    /**
     * Handle setValue call
     */
    private handleSetValue;
    /**
     * Handle updateValue call
     */
    private handleUpdateValue;
    /**
     * Handle hasKey call
     */
    private handleHasKey;
    /**
     * Handle getConfigurationKeys call
     */
    private handleGetConfigurationKeys;
    /**
     * Handle getAllValues call
     */
    private handleGetAllValues;
    /**
     * Handle reloadConfiguration call
     */
    private handleReloadConfiguration;
    /**
     * Handle configuration events
     * @future TODO: Implement full event streaming with proper cancellation
     */
    listen<T>(ctx: any, event: string, arg?: any): any;
    /**
     * Subscribe to configuration changes
     */
    subscribeToChanges(ctx: any, callback: (changes: any[]) => void): () => void;
}
//# sourceMappingURL=ConfigurationChannel.d.ts.map