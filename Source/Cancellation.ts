/**
 * @module Cancellation
 * @description Defines the service for managing cancellation tokens for long-running
 * or remote operations. This service allows for the creation, reuse, and disposal
 * of cancellation sources, which is crucial for preventing resource leaks and
 * unnecessary work in asynchronous workflows.
 */

import { Effect, HashMap, Ref } from "effect";
import { CancellationTokenSource } from "vs/base/common/cancellation.js";
import { InvalidTokenIdError } from "./Cancellation/InvalidTokenIdError.js";

/**
 * @interface Cancellation
 * @description The contract for the Cancellation service.
 */
export interface Cancellation {
	/**
	 * Obtains a `CancellationToken` for a given ID. This method returns a scoped
	 * `Effect`, ensuring the token source is automatically released when the
	 * scope is closed. If a source for the ID already exists, it is reused.
	 * @param TokenId - The numeric identifier for the token.
	 * @returns A scoped `Effect` that resolves to a `vscode.CancellationToken`.
	 */
	readonly ObtainToken: (
		TokenId: number,
	) => Effect.Effect<
		import("vscode").CancellationToken,
		InvalidTokenIdError,
		Effect.Scope
	>;

	/**
	 * Signals cancellation for a given token ID. If a `CancellationTokenSource`
	 * exists for the ID, its `cancel()` method is called.
	 * @param TokenId - The numeric identifier of the token to cancel.
	 * @returns An `Effect` that completes when the cancellation signal has been sent.
	 */
	readonly CancelToken: (TokenId: number) => Effect.Effect<void, never>;

	/**
	 * Disposes of all currently managed `CancellationTokenSource` instances and
	 * clears the internal registry. This is typically called on service shutdown.
	 * @returns An `Effect` that completes when all sources have been disposed.
	 */
	readonly DisposeAll: () => Effect.Effect<void, never>;
}

/**
 * @class Cancellation
 * @description The `Effect.Service` for managing cancellation tokens.
 * This service is scoped because it manages resources (`CancellationTokenSource`
 * instances) that must be cleaned up gracefully upon application shutdown.
 */
export class Cancellation extends Effect.Service<Cancellation>()(
	"Service/Cancellation",
	{
		scoped: Effect.gen(function* () {
			const SourceMap = yield* Ref.make(
				HashMap.empty<number, CancellationTokenSource>(),
			);

			const ObtainToken = (TokenId: number) => {
				const AcquireAndReleaseToken = Effect.acquireRelease(
					Effect.gen(function* () {
						if (TokenId <= 0) {
							return yield* new InvalidTokenIdError({ TokenId });
						}
						const ExistingSource = yield* Ref.get(SourceMap).pipe(
							Effect.map(HashMap.get(TokenId)),
						);
						if (ExistingSource._tag === "Some") {
							yield* Effect.logTrace(
								`Reusing CancellationTokenSource for TokenId: ${TokenId}.`,
							);
							return ExistingSource.value;
						}
						const NewSource = new CancellationTokenSource();
						yield* Ref.update(
							SourceMap,
							HashMap.set(TokenId, NewSource),
						);
						yield* Effect.logTrace(
							`Created new CancellationTokenSource for TokenId: ${TokenId}.`,
						);
						return NewSource;
					}),
					(Source) =>
						Ref.get(SourceMap).pipe(
							Effect.flatMap((TheMap) => {
								const CurrentSource = HashMap.get(
									TheMap,
									TokenId,
								);
								if (
									CurrentSource._tag === "Some" &&
									CurrentSource.value === Source
								) {
									return Ref.update(
										SourceMap,
										HashMap.remove(TokenId),
									).pipe(
										Effect.tap(() => {
											Source.dispose();
											return Effect.logTrace(
												`Disposed and removed CancellationTokenSource for TokenId: ${TokenId}.`,
											);
										}),
									);
								}
								return Effect.void;
							}),
							Effect.orDie,
						),
				).pipe(Effect.map((Source) => Source.token));

				// The returned Effect is scoped, ensuring automatic resource cleanup.
				return Effect.scoped(AcquireAndReleaseToken);
			};

			const CancelToken = (TokenId: number) =>
				Effect.gen(function* () {
					if (TokenId <= 0) {
						return yield* Effect.logWarning(
							`Attempted to cancel with an invalid TokenId: '${TokenId}'.`,
						);
					}
					const MaybeSource = yield* Ref.get(SourceMap).pipe(
						Effect.map(HashMap.get(TokenId)),
					);
					if (MaybeSource._tag === "Some") {
						yield* Effect.logDebug(
							`Received cancellation signal. Cancelling operation for TokenId: ${TokenId}.`,
						);
						MaybeSource.value.cancel();
					} else {
						yield* Effect.logWarning(
							`Cancellation signal for TokenId: ${TokenId}, but no active source was found.`,
						);
					}
				});

			const DisposeAll = () =>
				Ref.get(SourceMap).pipe(
					Effect.tap((TheMap) =>
						Effect.logDebug(
							`Disposing all (${HashMap.size(TheMap)}) managed CancellationTokenSources.`,
						),
					),
					Effect.flatMap((TheMap) =>
						Effect.forEach(
							HashMap.values(TheMap),
							(Source) => Effect.sync(() => Source.dispose()),
							{ discard: true, concurrency: "unbounded" },
						),
					),
					Effect.flatMap(() => Ref.set(SourceMap, HashMap.empty())),
					Effect.tap(() =>
						Effect.logTrace(
							"All CancellationTokenSources disposed and map cleared.",
						),
					),
				);

			// Register a finalizer to be run when the service's scope is closed.
			yield* Effect.addFinalizer(() => DisposeAll());

			return {
				ObtainToken,
				CancelToken,
				DisposeAll,
			};
		}),
	},
) {}
