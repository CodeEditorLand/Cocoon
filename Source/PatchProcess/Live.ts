/*
 * File: Cocoon/Source/PatchProcess/Live.ts
 * Role: Provides the "live" implementation Layer for the ProcessPatch service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `ProcessPatch` service.
 *   - Captures the original native process functions before they can be
 *     overwritten by other patches.
 */

import { Config, Effect, Layer, LogLevel } from "effect";
import { ProcessPatch } from "./Service.js";

/**
 * The live `Layer` for the `ProcessPatch.Service`.
 *
 * It reads its `AllowExit` configuration from the environment, with a safe
 * default (`false`). Any potential `Config.Error` is caught, logged as a warning,
 * and a default service implementation is provided. This ensures the final layer
 * has a `never` error channel and the application can always start.
 */
const Live: Layer.Layer<ProcessPatch, never, never> = Layer.effect(
	ProcessPatch,
	Effect.gen(function* (Generator) {
		const AllowExit = yield* Generator(Config.boolean("AllowExit"));
		return {
			NativeExit: process.exit.bind(process),
			NativeCrash:
				typeof process.crash === "function"
					? process.crash.bind(process)
					: undefined,
			AllowExit: () => AllowExit,
		};
	}).pipe(
		Effect.catchAll((Error) =>
			Effect.log("Failed to load ProcessPatch config, using defaults.", {
				Error,
				LogLevel: LogLevel.Warning,
			}).pipe(
				Effect.as({
					NativeExit: process.exit.bind(process),
					NativeCrash:
						typeof process.crash === "function"
							? process.crash.bind(process)
							: undefined,
					AllowExit: () => false, // Default to not allowing exit on error.
				}),
			),
		),
	),
);

export default Live;
