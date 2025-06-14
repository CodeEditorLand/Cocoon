/**
 * @module Service (ProcessPatch)
 * @description Defines the interface and Context.Tag for the ProcessPatch service.
 * This service provides the necessary native functions and configuration for the
 * other process patching Effects, such as `PatchProcessExit`.
 */

import { Context } from "effect";

/**
 * The `Context.Tag` for the ProcessPatch service.
 */
export default class extends Context.Tag("PatchProcess/ProcessPatch")<
	any,
	{
		/** The original, native `process.exit` function. */
		readonly NativeExit: (Code?: number) => never;
		/** The original, native `process.crash` function, if it exists. */
		readonly NativeCrash?: () => void;
		/** A predicate function that returns `true` if the process is allowed to exit. */
		readonly AllowExit: () => boolean;
	}
>() {}
