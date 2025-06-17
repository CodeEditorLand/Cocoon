/*
 * File: Cocoon/Source/PatchProcess/Live.ts
 * Responsibility: Implements a live layer for the ProcessPatch service in Cocoon.
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

/**
 * A `Config` object for configuring the ProcessPatch service.
 * This defines whether extensions are allowed to terminate the process.
 */
// FIX: The `.struct` and `.withDefault` APIs are from a newer version.
// Reverting to a more basic Config pattern.
const AllowExitConfig = Config.boolean("AllowExit");

/**
 * The live `Layer` for the `ProcessPatch.Service`.
 * It reads its configuration from the `ProcessPatchConfig` service.
 */
const Live = Layer.effect(
	Service,
	// FIX: Use `Effect.map` on the config instead of the newer `Config.map`.
	Effect.map(AllowExitConfig, (allowExit) => ({
		NativeExit: process.exit.bind(process),
		NativeCrash:
			typeof process.crash === "function"
				? process.crash.bind(process)
				: undefined,
		AllowExit: () => allowExit,
	})).pipe(
		// Provide a default value for the config if it's not set.
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
