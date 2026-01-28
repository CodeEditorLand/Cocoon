/**
 * @module CocoonMain
 * @description
 * Main entry point for Cocoon extension host.
 * Bootstrap script that initializes all services and starts the extension host.
 */

import { Effect, Layer } from "effect";
import { NodeRuntime } from "@effect/platform-node";

// Service mapping
import { ServiceMappingInstance } from "./ServiceMapping.js";
import { ExtensionHostService } from "./ServiceMapping.js";
import { IPCService } from "./ServiceMapping.js";
import { ModuleInterceptorService } from "./ServiceMapping.js";

// --- Bootstrap Logic ---

/**
 * Bootstrap the Cocoon extension host
 */
const bootstrapCocoon = Effect.gen(function* () {
    console.log("[CocoonMain] Starting Cocoon bootstrap...");
    
    // Validate service dependencies
    yield* ServiceMappingInstance.validateDependencies();
    
    // Compose application layer
    const appLayer = ServiceMappingInstance.composeAppLayer();
    console.log("[CocoonMain] Application layer composed");
    
    // Initialize IPC communication
    const ipcService = yield* IPCService;
    console.log("[CocoonMain] IPC service initialized");
    
    // Install module interceptor
    const moduleInterceptor = yield* ModuleInterceptorService;
    yield* moduleInterceptor.install();
    console.log("[CocoonMain] Module interceptor installed");
    
    // Perform handshake with Mountain
    console.log("[CocoonMain] Performing handshake with Mountain...");
    yield* performHandshake(ipcService);
    console.log("[CocoonMain] Handshake with Mountain completed");
    
    // Initialize extension host
    const extensionHost = yield* ExtensionHostService;
    console.log("[CocoonMain] Extension host initialized");
    
    // Start extension activation
    console.log("[CocoonMain] Activating startup extensions...");
    yield* activateStartupExtensions(extensionHost);
    console.log("[CocoonMain] Startup extensions activated");
    
    // Enter main event loop
    console.log("[CocoonMain] Entering main event loop...");
    yield* enterEventLoop(ipcService, extensionHost);
});

/**
 * Perform handshake with Mountain
 */
const performHandshake = (ipcService: any) => Effect.gen(function* () {
    // Send initial handshake notification
    yield* ipcService.sendNotification("$initialHandshake", []);
    
    // Wait for initialization data
    const initData = yield* ipcService.sendRequest("$getInitData", []);
    console.log("[CocoonMain] Received initialization data from Mountain");
    
    return initData;
}).pipe(
    Effect.catchAll((error) => Effect.gen(function* () {
        console.error("[CocoonMain] Handshake failed:", error);
        yield* Effect.logError("Failed to handshake with Mountain");
        return Effect.fail(error);
    }))
);

/**
 * Activate startup extensions
 */
const activateStartupExtensions = (extensionHost: any) => Effect.gen(function* () {
    // TODO: Get extension list from Mountain
    const startupExtensions = ["*" as any]; // Placeholder
    
    for (const extensionId of startupExtensions) {
        yield* extensionHost.activateExtension(extensionId, "*");
    }
    
    console.log(`[CocoonMain] Activated ${startupExtensions.length} startup extensions`);
});

/**
 * Enter main event loop
 */
const enterEventLoop = (ipcService: any, extensionHost: any) => Effect.gen(function* () {
    // Register IPC handlers
    yield* registerIPCHandlers(ipcService, extensionHost);
    
    // Keep process alive
    yield* Effect.never;
});

/**
 * Register IPC handlers for Mountain communication
 */
const registerIPCHandlers = (ipcService: any, extensionHost: any) => Effect.gen(function* () {
    console.log("[CocoonMain] Registering IPC handlers...");
    
    // Handle extension activation requests
    yield* ipcService.registerHandler("$activateExtension", async (extensionId: string, activationEvent: string) => {
        return Effect.runPromise(extensionHost.activateExtension(extensionId, activationEvent));
    });
    
    // Handle extension deactivation requests
    yield* ipcService.registerHandler("$deactivateExtension", async (extensionId: string) => {
        return Effect.runPromise(extensionHost.deactivateExtension(extensionId));
    });
    
    // Handle shutdown requests
    yield* ipcService.registerHandler("$shutdown", async () => {
        console.log("[CocoonMain] Received shutdown request from Mountain");
        
        // TODO: Implement proper deactivation
        // Deactivate all extensions
        
        process.exit(0); // Exit process
    });
    
    console.log("[CocoonMain] IPC handlers registered");
});

// --- Error handling and recovery ---

/**
 * Error handling and recovery
 */
const handleErrors = Effect.catchAll((error: any) => Effect.gen(function* () {
    console.error("[CocoonMain] Fatal error:", error);
    yield* Effect.logError("Cocoon process terminating due to error");
    
    // Attempt graceful shutdown
    process.exit(1);
}));

// --- Main Execution ---

/**
 * Main entry point
 */
const main = bootstrapCocoon.pipe(
    Effect.provide(ServiceMappingInstance.composeAppLayer()),
    handleErrors
);

/**
 * Run Cocoon
 */
const runCocoon = () => {
    console.log("[CocoonMain] Starting Cocoon extension host...");
    
    // Apply VSCode output directory if available
    const vsCodeOutputDir = process.env["VSCODE_OUT_DIR"];
    if (vsCodeOutputDir) {
        (module as any).paths.unshift(vsCodeOutputDir);
        console.log(`[CocoonMain] Added VSCode output directory: ${vsCodeOutputDir}`);
    }
    
    // Run the main effect
    NodeRuntime.runMain(main);
};

export { runCocoon };

// Export for testing
if (require.main === module) {
    runCocoon();
}
