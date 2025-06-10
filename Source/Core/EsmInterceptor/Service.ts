/**
 * @module Service (EsmInterceptor)
 * @description Defines the interface and Context.Tag for the EsmInterceptor service.
 */

import { Context, Effect } from "effect";

/**
 * The service interface for the ESM interceptor.
 * The `Install` effect is scoped and will automatically handle cleanup.
 */
export interface Interface {
	/**
	 * An Effect that, when executed within a Scope, installs the ESM loader hook
	 * and registers finalizers to clean up all resources (MessagePorts, globals)
	 * when the scope is closed.
	 */
	readonly Install: () => Effect.Effect<void, Error, Scope.Scope>;
}

/**
 * The Context.Tag for the EsmInterceptor service.
 */
export const Tag = Context.Tag<Interface>("Core/EsmInterceptor");
