/**
 * @module Service (Cancellation)
 * @description Defines the interface and Context.Tag for the CancellationTokenProvider service.
 * This service manages cancellation tokens for long-running RPC operations.
 */

import { Context, type Effect } from "effect";
import type { CancellationToken } from "vscode";

import type InvalidTokenIDError from "./Error/InvalidTokenIDError.js";

export default class CancellationService extends Context.Tag(
	"Service/CancellationTokenProvider",
)<
	CancellationService,
	{
		/**
		 * Creates and returns a CancellationToken for a given operation ID.
		 * The token's lifecycle is managed internally; its source is automatically
		 * disposed and cleaned up when the effect that uses it completes.
		 * @param TokenID The numeric ID for the operation.
		 * @returns An `Effect` that resolves to a `CancellationToken`.
		 */
		readonly ObtainToken: (
			TokenID: number,
		) => Effect.Effect<CancellationToken, InvalidTokenIDError>; // FIXED: No more Scope requirement.

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
