/**
 * @module IExtensionHostService
 * @description
 * Interface for Cocoon's extension host service.
 * Based on VSCode's extension host patterns.
 */
export interface IExtensionDescription {
    identifier: string;
    name: string;
    version: string;
    publisher: string;
    extensionLocation: string;
    activationEvents: string[];
    main?: string;
}
export interface ExtensionActivationReason {
    startup: boolean;
    activationEvent: string;
    extensionId: string;
}
export interface ActivatedExtension {
    activationTimes: {
        codeLoadingTime: number;
        activateCallTime: number;
        activateResolvedTime: number;
    };
    exports?: any;
}
export interface IExtensionHostService {
    readonly _serviceBrand: undefined;
    /**
     * Initialize the extension host service
     */
    initialize(): Promise<void>;
    /**
     * Activate an extension
     */
    activateExtension(extensionId: string, reason: ExtensionActivationReason): Promise<ActivatedExtension>;
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
 * Effect context for ExtensionHostService
 */
export declare const IExtensionHostService: any;
//# sourceMappingURL=IExtensionHostService.d.ts.map