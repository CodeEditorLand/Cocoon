/**
 * @module Live (ProcessPatch)
 * @description Provides the live implementation layer for the ProcessPatch service.
 * This layer captures the original native process functions before they can be
 * overwritten by any other patches.
 */

import { Layer } from "effect";

import Service from "./Service.js";

/**
 * A factory function that creates a live `Layer` for the `ProcessPatch` service.
 * @param AllowExit A predicate function that returns `true` if the host
 *   environment should permit the process to be terminated by an extension.
 * @returns A `Layer` that provides the `ProcessPatch.Service`.
 */
export const Live = (AllowExit: () => boolean) => {
	return Layer.succeed(Service, {
		NativeExit: process.exit.bind(process),
		NativeCrash:
			typeof (process ).crash === "function"
				? (process ).crash.bind(process)
				: undefined,
		AllowExit,
	});
};
