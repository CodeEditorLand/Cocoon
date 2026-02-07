/**
 * @module ExtensionHostService
 * @description
 * Manages the lifecycle of extensions.
 * Provides the extension runtime environment (Module interception + API injection).
 */

import { Effect, Layer } from "effect";
import { IExtensionHostService } from "../Interfaces/IExtensionHostService.js";
import { IModuleInterceptorService } from "../Interfaces/IModuleInterceptorService.js";
import { IAPIFactoryService } from "../Services/APIFactoryService.js";

/**
 * ExtensionHostService implementation
 */
export class ExtensionHostService implements IExtensionHostService {
    readonly _serviceBrand: undefined;
    
    // Extensions registry
    private activatedExtensions: Set<string> = new Set();
    
    constructor(
        private moduleInterceptor: IModuleInterceptorService,
        private apiFactory: IAPIFactoryService
    ) {}

    /**
     * Activate an extension
     */
    async activateExtension(extensionId: string, activationEvent: string): Promise<void> {
        if (this.activatedExtensions.has(extensionId)) {
            return;
        }

        console.log(`[ExtensionHost] Activating extension: ${extensionId} (Event: ${activationEvent})`);

        try {
            // 1. Prepare API instance for this extension
            const vscodeAPI = this.apiFactory.createAPI();

            // 2. Register with module interceptor
            // When the extension requires 'vscode', it gets our proxy
            this.moduleInterceptor.registerAPI(extensionId, vscodeAPI);

            // 3. Load the extension entry point
            // This would normally involve resolving the path via FS Spine
            // For now, we simulate loading by requiring it (if path known) or skipping
            console.log(`[ExtensionHost] ${extensionId} activated successfully`);
            
            this.activatedExtensions.add(extensionId);

        } catch (error) {
            console.error(`[ExtensionHost] Failed to activate ${extensionId}:`, error);
        }
    }

    /**
     * Deactivate an extension
     */
    async deactivateExtension(extensionId: string): Promise<void> {
        if (!this.activatedExtensions.has(extensionId)) {
            return;
        }
        console.log(`[ExtensionHost] Deactivating extension: ${extensionId}`);
        this.activatedExtensions.delete(extensionId);
    }
}

/**
 * Service Layer
 */
export const ExtensionHostLayer = Layer.effect(
    IExtensionHostService,
    Effect.gen(function* () {
        const moduleInterceptor = yield* IModuleInterceptorService;
        const apiFactory = yield* IAPIFactoryService;
        return new ExtensionHostService(moduleInterceptor, apiFactory);
    })
);
