/**
 * @module Live (ProcessPatch)
 * @description Provides the live implementation layer for the ProcessPatch service.
 */

import { Layer } from "effect";

import { Tag, type Interface } from "./Service.js";

/**
 * A factory function that creates a live `Layer` for the `ProcessPatch` service.
 *
 * This layer should be created very early in the application's lifecycle,
 * as it captures the original `process.exit` and `process.crash` functions
 * before any other patch can overwrite them.
 *
 * @param AllowExit - A predicate function that returns `true` if the host
 *   environment should permit the process to be terminated by an extension.
 * @returns A `Layer` that provides the `ProcessPatch.Service`.
 */
export const Live = (AllowExit: () => boolean) =>
	Layer.succeed(
		Tag,
		Tag.of({
			NativeExit: process.exit.bind(process),
			// Safely access `process.crash` as it's an Electron-specific, optional method.
			NativeCrash:
				typeof (process as any).crash === "function"
					? (process as any).crash.bind(process)
					: undefined,
			AllowExit,
		}),
	);
