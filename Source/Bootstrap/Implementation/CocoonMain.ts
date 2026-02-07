/**
 * @module CocoonMain
 * @description
 * Main entry point for Cocoon extension host.
 * Bootstrap script that initializes all services and starts the extension host.
 */

import { Emitter } from "@codeeditorland/output/vscode-dts/vscode";
import { NodeRuntime } from "@effect/platform-node";
import { Effect, Layer } from "effect";

import { IConfigurationService } from "../../Interfaces/IConfigurationService.js";
import { IExtensionHostService } from "../../Interfaces/IExtensionHostService.js";
import { IIPCService } from "../../Interfaces/IIPCService.js";
import { IModuleInterceptorService } from "../../Interfaces/IModuleInterceptorService.js";
import { IMountainClientService } from "../../Interfaces/IMountainClientService.js";
// Service mapping
import { ServiceMapping } from "../../ServiceMapping.js";
// Protocol implementation
import { CocoonGrpcAdapter } from "../Services/Adapters/CocoonGrpcAdapter.js";
import { MountainClientService } from "../Services/MountainClientService.js";

// --- Bootstrap Logic ---

/**
 * Bootstrap the Cocoon extension host
 */
const bootstrapCocoon = Effect.gen(function* () {
	console.log("[CocoonMain] Starting Cocoon bootstrap...");

	// Validate service dependencies
	yield* ServiceMapping.validateDependencies();

	// Compose application layer
	const appLayer = ServiceMapping.composeAppLayer();
	console.log("[CocoonMain] Application layer composed");

	// 1. Initialize the Real gRPC Client
	// This is the physical limb that connects to the Spine
	const mountainClient = yield* IMountainClientService;
	
	try {
		yield* Effect.promise(() => mountainClient.connect());
		console.log("[CocoonMain] 🟢 Connected to Mountain gRPC Spine");
	} catch (error) {
		console.error("[CocoonMain] 🔴 Failed to connect to Mountain:", error);
		process.exit(1);
	}

	// 2. Create the Spine Adapter (Bridge)
    // This pipes VS Code IPC messages directly into gRPC
    // Replacing the dummy 'CocoonMessagePassingProtocol'
    const protocol = new CocoonGrpcAdapter(mountainClient);

	// 3. Initialize IPC communication with the real adapter
	const ipcService = yield* IIPCService;
	yield* Effect.promise(() => ipcService.initialize(protocol));
	console.log("[CocoonMain] Advanced IPC service initialized with Spine Adapter");

	// Install module interceptor
	const moduleInterceptor = yield* IModuleInterceptorService;
	yield* moduleInterceptor.install();
	console.log("[CocoonMain] Module interceptor installed");

	// Perform handshake with Mountain
	console.log("[CocoonMain] Performing handshake with Mountain...");
	const initData = yield* performHandshake(ipcService);
	console.log("[CocoonMain] Handshake with Mountain completed", initData);

	// Initialize extension host
	const extensionHost = yield* IExtensionHostService;
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
const performHandshake = (ipcService: any) =>
	Effect.gen(function* () {
		// Send initial handshake notification
		// Maps to 'System.InitialHandshake' in Mountain Spine
		yield* ipcService.sendNotification("System", "InitialHandshake", []);

		// Wait for initialization data
		// Maps to 'System.GetInitData' in Mountain Spine
		const initData = yield* ipcService.sendRequest("System", "GetInitData", []);
		return initData;
	}).pipe(
		Effect.catchAll((error) =>
			Effect.gen(function* () {
				console.error("[CocoonMain] Handshake failed:", error);
				yield* Effect.logError("Failed to handshake with Mountain");
				return Effect.fail(error);
			}),
		),
	);

/**
 * Activate startup extensions
 */
const activateStartupExtensions = (extensionHost: any) =>
	Effect.gen(function* () {
		// TODO: Get extension list from Mountain
		const startupExtensions = ["*" as any]; // Placeholder

		for (const extensionId of startupExtensions) {
			yield* extensionHost.activateExtension(extensionId, "*");
		}

		console.log(
			`[CocoonMain] Activated ${startupExtensions.length} startup extensions`,
		);
	});

/**
 * Enter main event loop
 */
const enterEventLoop = (ipcService: unknown, extensionHost: unknown) =>
	Effect.gen(function* () {
		// Register IPC handlers
		yield* registerIPCHandlers(ipcService, extensionHost);

		// Keep process alive
		yield* Effect.never;
	});

/**
 * Register IPC handlers for Mountain communication
 */
const registerIPCHandlers = (ipcService: any, extensionHost: any) =>
	Effect.gen(function* () {
		console.log("[CocoonMain] Registering IPC handlers...");

		// Handle extension activation requests
		yield* ipcService.registerHandler(
			"$activateExtension",
			async (extensionId: string, activationEvent: string) => {
				return Effect.runPromise(
					extensionHost.activateExtension(
						extensionId,
						activationEvent,
					),
				);
			},
		);

		// Handle extension deactivation requests
		yield* ipcService.registerHandler(
			"$deactivateExtension",
			async (extensionId: string) => {
				return Effect.runPromise(
					extensionHost.deactivateExtension(extensionId),
				);
			},
		);

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
const handleErrors = Effect.catchAll((error: any) =>
	Effect.gen(function* () {
		console.error("[CocoonMain] Fatal error:", error);
		yield* Effect.logError("Cocoon process terminating due to error");

		// Attempt graceful shutdown
		process.exit(1);
	}),
);

// --- Main Execution ---

/**
 * Main entry point
 */
const main = bootstrapCocoon.pipe(
	Effect.provide(ServiceMapping.composeAppLayer()),
	handleErrors,
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
		console.log(
			`[CocoonMain] Added VSCode output directory: ${vsCodeOutputDir}`,
		);
	}

	// Run the main effect
	NodeRuntime.runMain(main);
};

export { runCocoon };

// Export for testing
if (require.main === module) {
	runCocoon();
}
