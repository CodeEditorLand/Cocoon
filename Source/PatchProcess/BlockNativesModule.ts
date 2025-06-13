/**
 * @module BlockNativesModule (PatchProcess)
 * @description An Effect that patches Node.js's internal module loader to
 * block the loading of the deprecated 'natives' module.
 */

import * as Module from "node:module";
import { Effect } from "effect";

class ModulePatchError extends Error {
	readonly _tag = "ModulePatchError";
	constructor(
		readonly context: string,
		readonly cause?: unknown,
	) {
		super(`Failed to patch Node.js module loader: ${context}`);
	}
}

/**
 * An Effect that, when executed, monkey-patches `Module._load` to throw an
 * error if an extension attempts to `require('natives')`. This was a legacy
 * Node.js internal module that is no longer available and can cause issues
 * if extensions try to access it.
 *
 * This patch is crucial for maintaining a stable and predictable runtime
 * environment similar to VS Code's extension host.
 *
 * @returns An `Effect` that resolves when the patch is applied, or fails with a
 *   `ModulePatchError`.
 */
export const BlockNativesModule = Effect.try({
	try: () => {
		// The `_load` function is an internal, undocumented part of Node's CJS loader.
		// We must check for its existence before attempting to patch it.
		if (typeof (Module as any)._load === "function") {
			const OriginalLoad = (Module as any)._load;

			(Module as any)._load = function (
				Request: string,
				Parent: any,
				IsMain: boolean,
			): any {
				if (Request === "natives") {
					const ErrorMessage =
						"Attempt to load deprecated 'natives' module blocked. This module is not available in the Cocoon runtime.";
					// Use a direct console warning here as this patch runs very early,
					// before the main logging service might be fully configured.
					console.warn(`[Cocoon PatchProcess] ${ErrorMessage}`);
					throw new Error(ErrorMessage);
				}
				// If the request is not for 'natives', delegate to the original loader.
				return OriginalLoad.call(this, Request, Parent, IsMain);
			};
		} else {
			// This environment (e.g., pure ESM) might not have _load. That's okay.
			console.warn(
				"[Cocoon PatchProcess] Module._load not found. Skipping 'natives' block patch.",
			);
		}
	},
	catch: (cause) =>
		new ModulePatchError("Failed during 'natives' block setup.", { cause }),
}).pipe(
	Effect.tap(() =>
		Effect.logTrace("Module._load patched to block 'natives' module."),
	),
);
