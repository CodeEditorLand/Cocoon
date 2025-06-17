/*
 * File: Cocoon/Source/Service/Cancellation/Service.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ./Error/InvalidTokenIDError.js, ./Type/TokenAndScope.js, effect
 * Export: CancellationService
 */

/**
 * @module Service (Cancellation)
 * @description Defines the interface and Context.Tag for the CancellationTokenProvider service.
 * This service manages cancellation tokens for long-running RPC operations.
 */

import { Context, Scope, type Effect } from "effect";

import type InvalidTokenIDError from "./Error/InvalidTokenIDError.js";
import type TokenAndScope from "./Type/TokenAndScope.js";

export default class CancellationService extends Context.Tag(
	"Service/CancellationTokenProvider",
)<
	CancellationService,
	{
		/**
		 * Acquires a CancellationToken for a given operation ID.
		 * This returns a scoped Effect. When the scope is closed, the token
		 * source is automatically disposed and cleaned up.
		 * @param TokenID The numeric ID for the operation.
		 * @returns A scoped `Effect` that resolves to a `TokenAndScope` object.
		 */
		readonly ObtainToken: (
			TokenID: number,
		) => Effect.Effect<TokenAndScope, InvalidTokenIDError, Scope.Scope>;

		/**
		 * Signals cancellation for a specific token ID.
		 * @param TokenID The numeric ID of the operation to cancel.
		 */
		readonly CancelToken: (TokenID: number) => Effect.Effect<void, never>;

		/**
		 * Disposes of all currently managed cancellation token sources.
		 * This is typically called during shutdown.
		 */
		readonly DisposeAll: () => Effect.Effect<void, never>;
	}
>() {}
