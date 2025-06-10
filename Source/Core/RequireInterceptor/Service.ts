/**
 * @module Service (RequireInterceptor)
 * @description Defines the interface and Context.Tag for the RequireInterceptor service.
 */

import { Context, Effect } from "effect";

/**
 * The service interface for the `require` interceptor.
 */
export interface Interface {
	/**
	 * An Effect that, when executed, patches the global `Module.prototype.require`
	 * function to enable interception. This should be run once at startup.
	 */
	readonly Install: () => Effect.Effect<void, Error>;
}

/**
 * The Context.Tag for the RequireInterceptor service.
 */
export const Tag = Context.Tag<Interface>("Core/RequireInterceptor");
