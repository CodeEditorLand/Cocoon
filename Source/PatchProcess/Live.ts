

/**
 * @module Live (ProcessPatch)
 * @description Provides the live implementation layer for the ProcessPatch service.
 * This layer captures the original native process functions before they can be
 * overwritten by any other patches.
 */

import { Config, Effect, Layer, LogLevel } from "effect";

import Service from "./Service.js";

/**
 * The live `Layer` for the `ProcessPatch.Service`.
 * It reads its configuration from the environment, with a default.
 */
// FIX: The Layer's error type must be `never`. We handle any potential
// `ConfigError` by using `Effect.catchAll` to provide a default service
// implementation in case of failure.
const Live: Layer.Layer<Service, never, never> = Layer.effect(
	Service,
	Effect.gen(function* (G) {
		const allowExit = yield* G(Config.boolean("AllowExit"));
		return {
			NativeExit: process.exit.bind(process),
			NativeCrash:
				typeof process.crash === "function"
					? process.crash.bind(process)
					: undefined,
			AllowExit: () => allowExit,
		};
	}).pipe(
		Effect.catchAll((error) =>
			Effect.log("Failed to load ProcessPatch config, using defaults.", {
				error,
				logLevel: LogLevel.Warning,
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
