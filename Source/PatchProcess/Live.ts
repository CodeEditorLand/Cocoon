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

import { Config, Layer } from "effect";

import Service from "./Service.js";

/**
 * A `Config` object for configuring the ProcessPatch service.
 * This defines whether extensions are allowed to terminate the process.
 */
const ProcessPatchConfig = Config.struct({
	AllowExit: Config.boolean("AllowExit").withDefault(false),
});

/**
 * The live `Layer` for the `ProcessPatch.Service`.
 * It reads its configuration from the `ProcessPatchConfig` service.
 */
const Live = Layer.effect(
	Service,
	Config.map(ProcessPatchConfig, (Config) => ({
		NativeExit: process.exit.bind(process),
		NativeCrash:
			typeof process.crash === "function"
				? process.crash.bind(process)
				: undefined,
		AllowExit: () => Config.AllowExit,
	})),
);

export default Live;
