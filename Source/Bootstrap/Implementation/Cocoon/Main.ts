import { NodeRuntime } from "@effect/platform-node";
import { Effect } from "effect";

// Import Tier dispatcher *after* __LandTiers is populated.
import "../../../Utility/Tier.js";

import { BootstrapTag, TelemetryTag } from "../../../Effect/index.js";
import { EffectServices } from "../../../Service/Mapping.js";

// PostHog telemetry - early init so bootstrap errors are captured.
// Dead-code eliminated by esbuild in production (NODE_ENV substitute).
type PostHogBridgeModule =
	typeof import("../../../Telemetry/Post/Hog/Bridge.js");

/**
 * @module CocoonMain
 * @description Main entry for Cocoon extension host.
 * Bootstraps services and starts the host via service-based or Effect-TS architecture.
 */

// ============================================================================
// TIER-GATING BOOTSTRAP - populate __LandTiers before any module that imports
// Utility/Tier.js executes. esbuild substitutes each `__LandTier_*__` via
// the define map in Configuration/ESBuild.
// ============================================================================
declare const __LandTier_RemoteProcedureCall__: string;

declare const __LandTier_HTTPProxy__: string;

declare const __LandTier_Logger__: string;

declare const __LandTier_FileSystem__: string;

declare const __LandTier_FindFiles__: string;

declare const __LandTier_Glob__: string;

declare const __LandTier_FileWatcher__: string;

declare const __LandTier_SchemeAssets__: string;

declare const __LandTier_Configuration__: string;

declare const __LandTier_Diagnostics__: string;

declare const __LandTier_Clipboard__: string;

declare const __LandTier_OpenExternal__: string;

declare const __LandTier_DocumentMirror__: string;

declare const __LandTier_ExtensionActivation__: string;

declare const __LandTier_ExtensionScan__: string;

declare const __LandTier_ModuleCache__: string;

declare const __LandTier_Telemetry__: string;

(globalThis as { __LandTiers?: Record<string, string> }).__LandTiers = {
	RemoteProcedureCall:
		typeof __LandTier_RemoteProcedureCall__ === "string"
			? __LandTier_RemoteProcedureCall__
			: (process.env["TierRemoteProcedureCall"] ?? "gRPC"),

	HTTPProxy:
		typeof __LandTier_HTTPProxy__ === "string"
			? __LandTier_HTTPProxy__
			: (process.env["TierHTTPProxy"] ?? "HandRolled"),

	Logger:
		typeof __LandTier_Logger__ === "string"
			? __LandTier_Logger__
			: (process.env["TierLogger"] ?? "Standard"),

	FileSystem:
		typeof __LandTier_FileSystem__ === "string"
			? __LandTier_FileSystem__
			: (process.env["TierFileSystem"] ?? "Layer2"),

	FindFiles:
		typeof __LandTier_FindFiles__ === "string"
			? __LandTier_FindFiles__
			: (process.env["TierFindFiles"] ?? "Layer3"),

	Glob:
		typeof __LandTier_Glob__ === "string"
			? __LandTier_Glob__
			: (process.env["TierGlob"] ?? "JavaScript"),

	FileWatcher:
		typeof __LandTier_FileWatcher__ === "string"
			? __LandTier_FileWatcher__
			: (process.env["TierFileWatcher"] ?? "Layer4"),

	SchemeAssets:
		typeof __LandTier_SchemeAssets__ === "string"
			? __LandTier_SchemeAssets__
			: (process.env["TierSchemeAssets"] ?? "Embedded"),

	Configuration:
		typeof __LandTier_Configuration__ === "string"
			? __LandTier_Configuration__
			: (process.env["TierConfiguration"] ?? "Cache"),

	Diagnostics:
		typeof __LandTier_Diagnostics__ === "string"
			? __LandTier_Diagnostics__
			: (process.env["TierDiagnostics"] ?? "Full"),

	Clipboard:
		typeof __LandTier_Clipboard__ === "string"
			? __LandTier_Clipboard__
			: (process.env["TierClipboard"] ?? "Layer3"),

	OpenExternal:
		typeof __LandTier_OpenExternal__ === "string"
			? __LandTier_OpenExternal__
			: (process.env["TierOpenExternal"] ?? "Layer3"),

	DocumentMirror:
		typeof __LandTier_DocumentMirror__ === "string"
			? __LandTier_DocumentMirror__
			: (process.env["TierDocumentMirror"] ?? "Full"),

	ExtensionActivation:
		typeof __LandTier_ExtensionActivation__ === "string"
			? __LandTier_ExtensionActivation__
			: (process.env["TierExtensionActivation"] ?? "Parallel8"),

	ExtensionScan:
		typeof __LandTier_ExtensionScan__ === "string"
			? __LandTier_ExtensionScan__
			: (process.env["TierExtensionScan"] ?? "Sequential"),

	ModuleCache:
		typeof __LandTier_ModuleCache__ === "string"
			? __LandTier_ModuleCache__
			: (process.env["TierModuleCache"] ?? "Simple"),

	Telemetry:
		typeof __LandTier_Telemetry__ === "string"
			? __LandTier_Telemetry__
			: (process.env["TierTelemetry"] ?? "Synchronous"),
};

// Telemetry init gated by esbuild's define - in prod builds the branch
// folds to false and the dynamic import drops from the bundle.
if (process.env["NODE_ENV"] !== "production") {
	const PostHogBridge: PostHogBridgeModule =
		await import("../../../Telemetry/Post/Hog/Bridge.js");

	PostHogBridge.default.Initialize();

	const _CocoonEntryLoadMillis = Date.now();

	PostHogBridge.default.CaptureEntryLoad("CocoonMain");

	// setImmediate fires one tick after top-level imports + gRPC server
	// bring-up, acting as a module-loaded signal for the Cocoon Lifecycle funnel.
	setImmediate(() => {
		PostHogBridge.default.CaptureEntryLoaded(
			"CocoonMain",

			Date.now() - _CocoonEntryLoadMillis,
		);
	});
}

// ============================================================================
// EFFECT-BASED BOOTSTRAP
// ============================================================================

/**
 * Bootstrap Cocoon using Effect-TS services
 */
const bootstrapCocoonEffect = Effect.gen(function* () {
	const telemetry = yield* TelemetryTag;
	const bootstrap = yield* BootstrapTag;

	telemetry.log(
		"info",

		"[CocoonMain] Starting Cocoon bootstrap with Effect-TS...",
	);

	// Run Effect-TS bootstrap
	const result = yield* bootstrap.run({ debugMode: false });

	if (!result.success) {
		// Partial bootstrap is acceptable - gRPC server may have started even if
		// Mountain connection failed. Log and continue in degraded mode.
		telemetry.log(
			"warn",

			"[CocoonMain] Bootstrap partially failed (continuing in degraded mode)",
		);
		try {
			process.stderr.write(
				"[CocoonMain] Bootstrap partially failed - running in degraded mode\n",
			);
		} catch {}
		for (const stage of result.stages) {
			if (!stage.success) {
				telemetry.log(
					"warn",

					`[CocoonMain]   - ${stage.stageName}: ${stage.error?.message}`,
				);
				try {
					process.stderr.write(
						`[CocoonMain]   Stage failed: ${stage.stageName}: ${stage.error?.message ?? "<no message>"}\n`,
					);
				} catch {}
			}
		}
	}

	if (result.success) {
		telemetry.log(
			"info",

			"[CocoonMain] [OK] Bootstrap completed successfully",
		);
	}
	telemetry.log(
		"info",

		`[CocoonMain] Total bootstrap time: ${result.totalDuration}ms`,
	);

	// gRPC server (Stage 5) holds an open libuv handle keeping the Effect
	// runtime alive. Extension activation via Mountain's $activateByEvent
	// drives the rest - no explicit event loop needed.
	telemetry.log("info", "[CocoonMain] Extension host ready");
});

/**
 * Map unknown errors to Error
 */
const mapUnknownToError = (error: unknown): Error => {
	if (error instanceof Error) {
		return error;
	}

	return new Error(String(error));
};

/**
 * Main effect with error handling and cleanup
 */
const mainEffectWithServices = bootstrapCocoonEffect.pipe(
	Effect.tapError((error) =>
		Effect.gen(function* () {
			const telemetry = yield* TelemetryTag;
			const mappedError = mapUnknownToError(error);
			telemetry.log(
				"error",

				`[CocoonMain] Fatal error: ${mappedError.message}`,
			);
			if (mappedError.stack) {
				telemetry.log(
					"error",

					`[CocoonMain] Error stack: ${mappedError.stack}`,
				);
			}
		}),
	),

	Effect.ensuring(
		Effect.gen(function* () {
			const telemetry = yield* TelemetryTag;
			telemetry.log(
				"info",

				"[CocoonMain] Cocoon extension host shutting down",
			);
		}),
	),
);

/**
 * Provide all service layers to create a runnable effect
 */
const mainEffect = mainEffectWithServices.pipe(
	Effect.provide(EffectServices.composeAppLayer()),

	Effect.scoped,
);

// ============================================================================
// PARENT-PID WATCHDOG
// ============================================================================
//
// Cocoon is spawned by Mountain (Tauri Rust). When Mountain crashes or is
// force-quit, Cocoon orphans - it keeps running and holds port 50052,
// preventing the next Mountain boot from binding the gRPC server.
//
// Self-exit on parent death closes the loop. Poll the parent PID every 5s
// via signal-0 (single syscall, no actual signal). When kill(parent, 0)
// returns ESRCH, the parent is gone - exit and free the port.
const ParentPid = process.ppid;
if (ParentPid && ParentPid > 1) {
	const ParentWatchInterval = setInterval(() => {
		try {
			// kill(pid, 0) checks existence (ESRCH = gone, EPERM = treat as alive)
			process.kill(ParentPid, 0);
		} catch (Err: any) {
			if (Err?.code === "ESRCH") {
				clearInterval(ParentWatchInterval);
				try {
					process.stderr.write(
						`[CocoonWatchdog] Parent PID ${ParentPid} gone; exiting to release gRPC port.\n`,
					);
				} catch {}
				// Exit code 130 (Ctrl+C convention) to prevent retry loop
				process.exit(130);
			}
			// EPERM: treat parent as alive, keep polling.
		}
	}, 5000);
	// unref() so the interval doesn't keep the event loop alive on its own
	ParentWatchInterval.unref?.();
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Main entry - runs the composed Effect via NodeRuntime
 */
NodeRuntime.runMain(mainEffect);
