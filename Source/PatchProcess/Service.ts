/*
 * File: Cocoon/Source/PatchProcess/Service.ts
 * Role: Defines the ProcessPatch service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Declare the contract for the service that provides access to native process
 *     functions and configuration for other process-patching Effects.
 *   - Provide the `Effect.Service` class for dependency injection.
 */

import { Config, Effect, LogLevel } from "effect";

/**
 * The `Effect.Service` for the `ProcessPatch` service.
 *
 * This service is a crucial part of the sandboxing mechanism. It captures the
 * original, native `process` functions before they can be overwritten, and it
 * holds the configuration that determines whether termination is allowed.
 */
export class ProcessPatch extends Effect.Service<ProcessPatch>()(
	"PatchProcess/ProcessPatch",
	{
		// The `effect` property defines how to construct the service.
		// This logic comes from your `Live.ts` file's Layer definition.
		effect: Effect.gen(function* (Generator) {
			const AllowExit = yield* Generator(Config.boolean("AllowExit"));
			return {
				NativeExit: process.exit.bind(process),
				NativeCrash:
					typeof process.crash === "function"
						? process.crash.bind(process)
						: undefined,
				AllowExit: () => AllowExit,
			};
		}).pipe(
			// The error handling from your `Live.ts` is preserved here.
			Effect.catchAll((Error) =>
				Effect.log(
					"Failed to load ProcessPatch config, using defaults.",
					{
						Error,
						LogLevel: LogLevel.Warning,
					},
				).pipe(
					Effect.as({
						NativeExit: process.exit.bind(process),
						NativeCrash:
							typeof process.crash === "function"
								? process.crash.bind(process)
								: undefined,
						AllowExit: () => false, // Default to not allowing exit on error.
					}),
				),
			),
		),
	},
) {}
