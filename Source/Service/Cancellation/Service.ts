/**
 * @module Service (Cancellation)
 * @description Defines the interface and Context.Tag for the CancellationTokenProvider service.
 */

import { Context, Effect } from "effect";

import type { InvalidTokenIdError } from "./Error.js";
import type { TokenAndScope } from "./Type.js";

/**
 * The service interface for the cancellation token provider.
 */
export interface Interface {
	/**
	 * Acquires a CancellationToken for a given operation ID.
	 * This returns a scoped Effect. When the scope is closed, the token
	 * source is automatically disposed and cleaned up.
	 */
	readonly ObtainToken: (
		TokenId: number,
	) => Effect.Effect<TokenAndScope, InvalidTokenIdError, Effect.Scope>;

	/**
	 * Signals cancellation for a specific token ID.
	 */
	readonly CancelToken: (TokenId: number) => Effect.Effect<void, never>;

	/**
	 * Disposes of all currently managed cancellation token sources.
	 */
	readonly DisposeAll: () => Effect.Effect<void, never>;
}

/**
 * The Context.Tag for the CancellationTokenProvider service.
 */
export const Tag = Context.Tag<Interface>("Service/CancellationTokenProvider");
