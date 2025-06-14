/**
 * @module Service (Log)
 * @description Defines the interface and Context.Tag for the Log service.
 * This is a simple, internal logging facade that other services can use,
 * which will eventually route to the main `Effect` logger.
 */

import { Context, type Effect } from "effect";

export default class extends Context.Tag("Service/Log")<
	any,
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
