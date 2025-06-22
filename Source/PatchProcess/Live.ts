/*
 * File: Cocoon/Source/PatchProcess/Live.ts
 *
 * This file provides the live implementation layer for the ProcessPatch service.
 * This layer captures the original native process functions before they can be
 * overwritten by any other patches.
 */

import { Config, Effect, Layer, LogLevel } from "effect";

import Service from "./Service.js";

/**
 * The live `Layer` for the `ProcessPatch.Service`.
 * It reads its configuration from the environment, with a default. The potential
 * `ConfigError` is caught and a default service implementation is provided,
 * ensuring the final layer has a `never` error channel.
 */
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
					// Default to not allowing exit on error.
					AllowExit: () => false,
				}),
			),
		),
	),
);

export default Live;
