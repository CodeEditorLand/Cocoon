/*
 * File: Cocoon/Source/PatchProcess/BlockNativesModule.ts
 * Role: Provides an Effect to block the deprecated 'natives' Node.js module.
 * Responsibilities:
 *   - Monkey-patches `Module._load` to throw an error if an extension
 *     attempts to `require('natives')`, preventing use of this outdated and
 *     unsupported module.
 */

import * as Module from "node:module";
import { Data, Effect } from "effect";

/**
 * A tagged error for failures during the patching of the Node.js module loader.
 */
class ModulePatchProblem extends Data.TaggedError("ModulePatchProblem")<{
	readonly Context: string;
	readonly Cause?: unknown;
}> {
	constructor(Properties: {
		readonly Context: string;
		readonly Cause?: unknown;
	}) {
		super(Properties);
		this.message = `Failed to patch Node.js module loader: ${this.Context}`;
	}
	public override readonly message: string;
}

/**
 * An `Effect` that, when executed, monkey-patches `Module._load` to throw an
 * error if an extension attempts to `require('natives')`.
 *
 * @returns An `Effect` that resolves when the patch is applied, or fails with a
 *   `ModulePatchProblem`.
 */
export const BlockNativesModule = Effect.try({
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
	catch: (Cause) =>
		new ModulePatchProblem({
			Context: "Failed during 'natives' block setup.",
			Cause,
		}),
}).pipe(
	Effect.tap(() =>
		Effect.logTrace("Module._load patched to block 'natives' module."),
	),
);
