/**
 * @module Service (ProcessPatch)
 * @description Defines the interface and Context.Tag for the ProcessPatch service.
 * This service provides the necessary native functions and configuration for the
 * other process patching Effects, such as `PatchProcessExit`.
 */

import { Context } from "effect";

/**
 * The service interface for the ProcessPatch service.
 * It provides access to the original, un-patched process functions and the
 * host's policy on whether exiting is permitted.
 */
export interface Interface {
	/** The original, native `process.exit` function. */
	readonly NativeExit: (code?: number) => never;
	/** The original, native `process.crash` function, if it exists. */
	readonly NativeCrash?: () => void;
	/** A predicate function that returns `true` if the process is allowed to exit. */
	readonly AllowExit: () => boolean;
}

/**
 * The Context.Tag for the ProcessPatch service.
 */
export const Tag = Context.Tag<Interface>("PatchProcess/ProcessPatch");
