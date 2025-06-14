/**
 * @module Service (Log)
 * @description Defines the interface and Context.Tag for the Log service.
 * This is a simple, internal logging facade that other services can use,
 * which will eventually route to the main `Effect` logger.
 */

import { Context, type Effect } from "effect";

export interface Interface {
	readonly Trace: (
		message: string,
		...data: any[]
	) => Effect.Effect<void, never>;
	readonly Debug: (
		message: string,
		...data: any[]
	) => Effect.Effect<void, never>;
	readonly Info: (
		message: string,
		...data: any[]
	) => Effect.Effect<void, never>;
	readonly Warn: (
		message: string,
		...data: any[]
	) => Effect.Effect<void, never>;
	readonly Error: (
		message: string,
		...data: any[]
	) => Effect.Effect<void, never>;
	readonly Fatal: (
		message: string,
		...data: any[]
	) => Effect.Effect<void, never>;
}

export const Tag = Context.Tag<Interface>("Service/Log");
