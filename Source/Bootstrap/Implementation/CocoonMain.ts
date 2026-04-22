/**
 * @module CocoonMain
 * @description
 * Main entry point for Cocoon extension host.
 * Bootstrap script that initializes all services and starts the extension host.
 *
 * Supports both old-style service-based architecture and new Effect-TS based architecture.
 */

// ============================================================================
// TIER-GATING BOOTSTRAP - populate globalThis.__LandTiers before any module
// that imports Utility/Tier.js executes. Done as the very first line of the
// bundle so `Pick(...)` resolves against concrete values instead of the
// fallbacks. esbuild substitutes every `__LandTier_*__` identifier for its
// JSON-encoded value via the `define` map in Configuration/ESBuild.
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
			: (process.env["TierRemoteProcedureCall"] ?? "GRPC"),
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
			: (process.env["TierFileWatcher"] ?? "Stub"),
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

import { NodeRuntime } from "@effect/platform-node";
import { Effect } from "effect";

// Import Tier dispatcher *after* __LandTiers is populated so the module's
// top-level `LandFixLog.Info(...)` banner reports the resolved values.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Tier from "../../Utility/Tier.js";

// Effect services
import { BootstrapTag, TelemetryTag } from "../../Effect/index.js";
import { EffectServices } from "../../ServiceMapping.js";

// ============================================================================
// EFFECT-BASED BOOTSTRAP (NEW APPROACH)
// ============================================================================

/**
 * Bootstrap the Cocoon extension host using Effect-TS services
 * This is the modern, recommended approach
 */
const bootstrapCocoonEffect = Effect.gen(function* () {
	const telemetry = yield* TelemetryTag;
	const bootstrap = yield* BootstrapTag;

	telemetry.log(
		"info",
		"[CocoonMain] Starting Cocoon bootstrap with Effect-TS...",
	);

	// Run the Effect-TS bootstrap orchestration
	const result = yield* bootstrap.run({ debugMode: false });

	if (!result.success) {
		// Log failures but continue - partial bootstrap is acceptable.
		// The gRPC server (Stage 5) may have started even if Mountain
		// connection (Stage 3) failed temporarily.
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

	// From this point the gRPC server (Stage 5) holds an open libuv handle,
	// which keeps the Effect runtime alive. Extension activation is driven by
	// Mountain's `$activateByEvent` notifications - no explicit event loop
	// is needed here.
	telemetry.log("info", "[CocoonMain] Extension host ready");
});

/**
 * Map unknown errors to Error type for consistent handling
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
// MAIN ENTRY POINT
// ============================================================================

/**
 * Main entry point for Cocoon extension host
 * Uses Effect-TS NodeRuntime to run the application
 */
NodeRuntime.runMain(mainEffect);
