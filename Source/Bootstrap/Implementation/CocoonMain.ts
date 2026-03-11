/**
 * @module CocoonMain
 * @description
 * Main entry point for Cocoon extension host.
 * Bootstrap script that initializes all services and starts the extension host.
 *
 * Supports both old-style service-based architecture and new Effect-TS based architecture.
 */

import { NodeRuntime } from "@effect/platform-node";
import { Effect } from "effect";

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
		telemetry.log("error", "[CocoonMain] Bootstrap failed");
		for (const stage of result.stages) {
			if (!stage.success) {
				telemetry.log(
					"error",
					`[CocoonMain]   - ${stage.stageName}: ${stage.error?.message}`,
				);
			}
		}
		return yield* Effect.die(new Error("Bootstrap failed"));
	}

	telemetry.log("info", "[CocoonMain] 🟢 Bootstrap completed successfully");
	telemetry.log(
		"info",
		`[CocoonMain] Total bootstrap time: ${result.totalDuration}ms`,
	);

	// TODO: Enter main event loop for extension handling
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
