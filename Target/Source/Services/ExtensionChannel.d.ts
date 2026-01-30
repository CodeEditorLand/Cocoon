/**
 * @module ExtensionChannel
 * @description
 * Server channel implementation for extension host communication.
 * Based on VS Code's ExtensionHostService channel pattern.
 *
 * Architecture Specification: VS Code Extension Host Channel
 * Implementation: Extension lifecycle management via channels
 * Validation: Test with extension activation/deactivation cycles
 */
import { IServerChannel } from "../Interfaces/IIPCService";
import { IExtensionHostService } from "../Interfaces/IExtensionHostService";
import { CancellationToken } from "@codeeditorland/output/vscode-dts/vscode";
/**
 * Extension host channel implementation
 * Specification: src/vs/workbench/api/common/extHostExtensionService.ts
 * Implementation: Extension lifecycle management
 */
export declare class ExtensionChannel implements IServerChannel<any> {
    private readonly extensionHostService;
    constructor(extensionHostService: IExtensionHostService);
    /**
     * Handle extension-related calls
     */
    call<T>(ctx: any, command: string, arg?: any, cancellationToken?: CancellationToken): Promise<T>;
    /**
     * Handle extension activation
     */
    private handleActivateExtension;
    /**
     * Handle extension deactivation
     */
    private handleDeactivateExtension;
    /**
     * Get extension exports
     */
    private handleGetExtensionExports;
    /**
     * Get extension status
     */
    private handleGetExtensionStatus;
    /**
     * Handle extension events
     */
    listen<T>(ctx: any, event: string, arg?: any): any;
}
//# sourceMappingURL=ExtensionChannel.d.ts.map