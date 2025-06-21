/**
 * @module BlockNativesModule (PatchProcess)
 * @description An Effect that patches Node.js's internal module loader to
 * block the loading of the deprecated 'natives' module.
 */

import * as Module from "node:module";
import { Data, Effect } from "effect";

class ModulePatchError extends Data.TaggedError("ModulePatchError")<{
	readonly context: string;
	readonly cause?: unknown;
}> {
	constructor(Properties: {
		readonly context: string;
		readonly cause?: unknown;
	}) {
		super(Properties);
		this.message = `Failed to patch Node.js module loader: ${this.context}`;
	}
	public override readonly message: string;
}

/**
 * An Effect that, when executed, monkey-patches `Module._load` to throw an
 * error if an extension attempts to `require('natives')`.
 *
 * @returns An `Effect` that resolves when the patch is applied, or fails with a
 *   `ModulePatchError`.
 */
const BlockNativesModuleEffect = Effect.try({
	try: () => {
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
					console.warn(`[Cocoon PatchProcess] ${ErrorMessage}`);
					throw new Error(ErrorMessage);
				}
				return OriginalLoad.call(this, Request, Parent, IsMain);
			};
		} else {
			console.warn(
				"[Cocoon PatchProcess] Module._load not found. Skipping 'natives' block patch.",
			);
		}
	},
	catch: (cause) =>
		new ModulePatchError({
			context: "Failed during 'natives' block setup.",
			cause,
		}),
}).pipe(
	Effect.tap(() =>
		Effect.logTrace("Module._load patched to block 'natives' module."),
	),
);

export default BlockNativesModuleEffect;
