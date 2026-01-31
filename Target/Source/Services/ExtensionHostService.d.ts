/**
 * @module ExtensionHostService
 * @description
 * Cocoon's implementation of VSCode's extension host service.
 * Manages extension lifecycle, activation, and provides vscode API to extensions.
 *
 * Based on VSCode's AbstractExtHostExtensionService pattern.
 * Integrated with Mountain via gRPC and Wind via configuration synchronization.
 */
import { Layer } from "effect";
import { IConfigurationService } from "../Interfaces/IConfigurationService";
import { IExtensionHostService } from "../Interfaces/IExtensionHostService";
import { IIPCService } from "../Interfaces/IIPCService";
interface ExtensionActivationReason {
    startup: boolean;
    activationEvent: string;
    extensionId: string;
}
interface ActivatedExtension {
    activationTimes: {
        codeLoadingTime: number;
        activateCallTime: number;
        activateResolvedTime: number;
    };
    exports?: any;
}
/**
 * ExtensionHostService implementation following VSCode patterns
 */
export declare class ExtensionHostService implements IExtensionHostService {
    readonly _serviceBrand: undefined;
    private configurationService;
    private ipcService;
    private _started;
    private _isTerminating;
    private _extensionRegistry;
    private _activatedExtensions;
    private _readyToRunExtensions;
    constructor(configurationService: IConfigurationService, ipcService: IIPCService);
    /**
     * Initialize the extension host service
     */
    initialize(): Promise<void>;
    /**
     * Initialize service dependencies
     */
    private initializeDependencies;
    /**
     * Set up extension registry
     */
    private setupExtensionRegistry;
    /**
     * Create extension registry
     */
    private createExtensionRegistry;
    /**
     * Activate an extension
     */
    activateExtension(extensionId: string, reason: ExtensionActivationReason): Promise<ActivatedExtension>;
    /**
     * Actual extension activation logic
     */
    private _doActivateExtension;
    /**
     * Load extension module with advanced interception
     */
    private _loadExtensionModule;
    /**
     * Call extension's activate function
     */
    private _callActivate;
    /**
     * Create complete VS Code extension context
     */
    private createExtensionContext;
    /**
     * Check if extension is activated
     */
    isActivated(extensionId: string): boolean;
    /**
     * Get activated extension
     */
    getActivatedExtension(extensionId: string): ActivatedExtension | undefined;
    /**
     * Deactivate an extension
     */
    deactivateExtension(extensionId: string): Promise<void>;
    /**
     * Terminate the extension host
     */
    terminate(reason: string, code?: number): Promise<void>;
    /**
     * Cleanup service dependencies
     */
    private cleanupServices;
    /**
     * Get extension host status
     */
    getStatus(): {
        started: boolean;
        terminating: boolean;
        activatedExtensions: number;
        ready: boolean;
    };
}
/**
 * Service layer for ExtensionHostService
 */
export declare const ExtensionHostServiceLayer: Layer.Layer<unknown, never, never>;
/**
 * Live implementation for testing
 */
export declare const ExtensionHostServiceLive: Layer.Layer<unknown, never, never>;
export {};
//# sourceMappingURL=ExtensionHostService.d.ts.map