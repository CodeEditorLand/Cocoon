/*
 * File: Cocoon/Source/Service/Log/Service.ts
 * Responsibility:
 * Modified: 2025-06-15 19:16:56 UTC
 * Dependency: effect
 * Export: LogService
 */

/**
 * @module Service (Log)
 * @description Defines the interface and Context.Tag for the Log service.
 * This is a simple, internal logging facade that other services can use,
 * which will eventually route to the main `Effect` logger.
 */

import { Context, type Effect } from "effect";

export default class LogService extends Context.Tag("Service/Log")<
	LogService,
	{
		readonly Trace: (
			Message: string,
			...Data: readonly any[]
		) => Effect.Effect<void, never>;
		readonly Debug: (
			Message: string,
			...Data: readonly any[]
		) => Effect.Effect<void, never>;
		readonly Info: (
			Message: string,
			...Data: readonly any[]
		) => Effect.Effect<void, never>;
		readonly Warn: (
			Message: string,
			...Data: readonly any[]
		) => Effect.Effect<void, never>;
		readonly Error: (
			Message: string,
			...Data: readonly any[]
		) => Effect.Effect<void, never>;
		readonly Fatal: (
			Message: string,
			...Data: readonly any[]
		) => Effect.Effect<void, never>;
	}
>() {}
