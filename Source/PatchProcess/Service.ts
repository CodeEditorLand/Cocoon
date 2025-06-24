/*
 * File: Cocoon/Source/PatchProcess/Service.ts
 * Role: Defines the interface and Effect.Service for the ProcessPatch service.
 * Responsibilities:
 *   - Declare the contract for the service that provides access to native process
 *     functions and configuration for other process-patching Effects.
 *   - Provide the `Effect.Service` for dependency injection.
 */

import { Effect } from "effect";

/**
 * The `Effect.Service` for the `ProcessPatch` service.
 *
 * This service is a crucial part of the sandboxing mechanism. It captures the
 * original, native `process` functions before they can be overwritten, and it
 * holds the configuration that determines whether termination is allowed.
 */
export class ProcessPatch extends Effect.Service<ProcessPatch>(
	"PatchProcess/ProcessPatch",
)<{
	/** The original, native `process.exit` function. */
	readonly NativeExit: (Code?: number) => never;

	/** The original, native `process.crash` function, if it exists. */
	readonly NativeCrash?: () => void;

	/** A predicate function that returns `true` if the process is allowed to exit. */
	readonly AllowExit: () => boolean;
}>() {}
