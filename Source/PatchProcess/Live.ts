/*
 * File: Cocoon/Source/PatchProcess/Live.ts
 * Responsibility: Implements the live layer for the ProcessPatch service.
 * Modified: 2025-06-17 11:21:12 UTC
 */

/**
 * @module Live (ProcessPatch)
 * @description Provides the live implementation layer for the ProcessPatch service.
 * This layer captures the original native process functions before they can be
 * overwritten by any other patches.
 */

import { Config, Effect, Layer } from "effect";

import Service from "./Service.js";

// FIX: Reverted to a more compatible API shape for Config.
const AllowExitConfig: Config.Config<boolean> = Config.boolean("AllowExit");

/**
 * The live `Layer` for the `ProcessPatch.Service`.
 * It reads its configuration from the environment, with a default.
 */
const Live: Layer.Layer<Service, never, never> = Layer.effect(
	Service,
	Effect.config(AllowExitConfig).pipe(
		// FIX: First create the effect with Effect.config
		Effect.map((allowExit) => ({
			NativeExit: process.exit.bind(process),
			NativeCrash:
				typeof process.crash === "function"
					? process.crash.bind(process)
					: undefined,
			AllowExit: () => allowExit,
		})),
		// FIX: Then, handle the error case for the Effect.
		Effect.catchTag("MissingData", () =>
			Effect.succeed({
				NativeExit: process.exit.bind(process),
				NativeCrash:
					typeof process.crash === "function"
						? process.crash.bind(process)
						: undefined,
				AllowExit: () => false, // Default to not allowing exit.
			}),
		),
	),
);

export default Live;
