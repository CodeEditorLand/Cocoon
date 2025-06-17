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
const Live = Layer.effect(
	Service,
	Effect.map(AllowExitConfig, (allowExit) => ({
		NativeExit: process.exit.bind(process),
		NativeCrash:
			typeof process.crash === "function"
				? process.crash.bind(process)
				: undefined,
		AllowExit: () => allowExit,
	})).pipe(
		// FIX: Use catchTag to provide a default value if the config is missing.
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
