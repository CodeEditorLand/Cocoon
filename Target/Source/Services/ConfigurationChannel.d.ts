/**
 * @module ConfigurationChannel
 * @description
 * Server channel implementation for configuration management.
 * Based on VS Code's ConfigurationService channel pattern.
 *
 * Architecture Specification: VS Code Configuration Service Channel
 * Implementation: Configuration synchronization with Mountain
 * Validation: Test with configuration updates across scopes
 */
import { IServerChannel } from "../Interfaces/IIPCService";
import { IConfigurationService } from "../Interfaces/IConfigurationService";
import { CancellationToken } from "@codeeditorland/output/vscode-dts/vscode";
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
     */
    listen<T>(ctx: any, event: string, arg?: any): any;
}
//# sourceMappingURL=ConfigurationChannel.d.ts.map