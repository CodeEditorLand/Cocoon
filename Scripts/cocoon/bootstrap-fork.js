#!/usr/bin/env node

/**
 * @module bootstrap-fork
 * @description
 * Cocoon bootstrap script for Mountain integration.
 * This script is launched by Mountain as a sidecar process.
 *
 * Based on Mountain's CocoonManagement.rs launch pattern.
 * Specification: MOUNTAIN-COCOON-INTEGRATION.md (Bootstrap Process)
 */
import { Effect } from "effect";

import { ServiceMapping } from "../Source/ServiceMapping.js";
import { GRPCServerService } from "../Source/Services/GRPCServerService.js";
import { MountainClientService } from "../Source/Services/MountainClientService.js";

/**
 * Bootstrap process entry point
 */
async function bootstrap() {
	console.log("[Cocoon] Bootstrap script starting");

	console.log(`[Cocoon] Process PID: ${process.pid}`);

	console.log(
		`[Cocoon] Parent PID: ${process.env.VSCODE_PARENT_PID || "unknown"}`,
	);

	// Parse environment variables
	const mountaingRPCPort = process.env.MOUNTAIN_GRPC_PORT || "50051";

	const cocoongRPCPort = process.env.COCOON_GRPC_PORT || "50052";

	const nodeEnv = process.env.NODE_ENV || "production";

	console.log(`[Cocoon] Environment:`);

	console.log(`  - MOUNTAIN_GRPC_PORT: ${mountaingRPCPort}`);

	console.log(`  - COCOON_GRPC_PORT: ${cocoongRPCPort}`);

	console.log(`  - NODE_ENV: ${nodeEnv}`);

	console.log(
		`  - VSCODE_PARENT_PID: ${process.env.VSCODE_PARENT_PID || "unknown"}`,
	);

	try {
		// Initialize service mapping
		console.log("[Cocoon] Initializing service mapping");

		const services = ServiceMapping.getRegisteredServices();

		console.log(`[Cocoon] Registered services: ${services.join(", ")}`);

		// Start gRPC services
		await startServices();

		// Signal readiness to Mountain
		await signalReadiness();

		console.log(
			"[Cocoon] Bootstrap complete - Cocoon ready for Mountain integration",
		);

		// Keep process alive
		process.on("SIGTERM", handleShutdown);

		process.on("SIGINT", handleShutdown);

		process.on("SIGUSR2", handleShutdown);
	} catch (error) {
		console.error("[Cocoon] Bootstrap failed:", error);

		process.exit(1);
	}
}

/**
 * Start gRPC services
 */
async function startServices() {
	console.log("[Cocoon] Starting gRPC services");

	try {
		// Start Mountain client service
		const mountainClientService = new MountainClientService();

		await mountainClientService.connect();

		const mountainStatus = mountainClientService.getStatus();

		console.log("[Cocoon] Mountain client status:", mountainStatus);

		// Start gRPC server service
		const grpcServerService = new GRPCServerService();

		await grpcServerService.start();

		const serverStatus = grpcServerService.getStatus();

		console.log(`[Cocoon] gRPC server status:`, serverStatus);

		console.log("[Cocoon] gRPC services started successfully");
	} catch (error) {
		console.error("[Cocoon] Failed to start gRPC services:", error);

		throw error;
	}
}

/**
 * Signal readiness to Mountain
 */
async function signalReadiness() {
	console.log("[Cocoon] Signaling readiness to Mountain");

	try {
		// Send readiness notification to Mountain via gRPC
		const mountainClientService = new MountainClientService();

		await mountainClientService.connect();

		// Signal readiness with process information
		await mountainClientService.sendNotification("cocoon.ready", {
			pid: process.pid,
			port: process.env.COCOON_GRPC_PORT || "50052",
			version: process.env.npm_package_version || "0.0.1",
		});

		console.log("[Cocoon] Readiness signaled to Mountain");
	} catch (error) {
		console.error("[Cocoon] Failed to signal readiness:", error);

		throw error;
	}
}

/**
 * Handle graceful shutdown
 */
async function handleShutdown(signal) {
	console.log(`[Cocoon] Received ${signal}, shutting down gracefully`);

	try {
		// Stop gRPC services and cleanup resources
		const mountainClientService = new MountainClientService();

		const grpcServerService = new GRPCServerService();

		// Send shutdown notification to Mountain
		await mountainClientService.sendNotification("cocoon.shutdown", {
			pid: process.pid,
			reason: signal,
		});

		// Stop gRPC server
		await grpcServerService.stop();

		console.log("[Cocoon] gRPC server stopped");

		// Disconnect from Mountain
		await mountainClientService.disconnect();

		console.log("[Cocoon] Mountain client disconnected");

		console.log("[Cocoon] Graceful shutdown complete");

		process.exit(0);
	} catch (error) {
		console.error("[Cocoon] Error during shutdown:", error);

		process.exit(1);
	}
}

/**
 * Handle uncaught exceptions
 */
process.on("uncaughtException", (error) => {
	console.error("[Cocoon] Uncaught exception:", error);

	process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
	console.error(
		"[Cocoon] Unhandled rejection at:",

		promise,

		"reason:",

		reason,
	);

	process.exit(1);
});

/**
 * Entry point
 */
if (require.main === module) {
	bootstrap().catch((error) => {
		console.error("[Cocoon] Bootstrap error:", error);

		process.exit(1);
	});
}

export default bootstrap;
