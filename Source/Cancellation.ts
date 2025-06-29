/**
 * @module Cancellation
 * @description Defines the service for managing cancellation tokens for long-running
 * or remote operations. This service allows for the creation, reuse, and disposal
 * of cancellation sources, which is crucial for preventing resource leaks and
 * unnecessary work in asynchronous workflows.
 */

import { Effect, HashMap, Ref, type Scope } from "effect";
import { CancellationTokenSource } from "vs/base/common/cancellation.js";
import type { CancellationToken } from "vscode";

import { InvalidTokenIdProblem } from "./Cancellation/InvalidTokenIdProblem.js";

/**
 * @interface Cancellation
 * @description The contract for the Cancellation service.
 */
export interface Cancellation {
	readonly ObtainToken: (
		TokenId: number,
	) => Effect.Effect<CancellationToken, InvalidTokenIdProblem, Scope.Scope>;
	readonly CancelToken: (TokenId: number) => Effect.Effect<void, never>;
	readonly DisposeAll: () => Effect.Effect<void, never>;
}

/**
 * @class Cancellation
 * @description The `Effect.Service` for managing cancellation tokens.
 * This service is scoped because it manages resources (`CancellationTokenSource`
 * instances) that must be cleaned up gracefully upon application shutdown.
 */
export class CancellationService extends Effect.Service<CancellationService>()(
	"Service/Cancellation",
	{
		scoped: Effect.gen(function* () {
			const SourceMap = yield* Ref.make(
				HashMap.empty<number, CancellationTokenSource>(),
			);

			const ObtainToken = (TokenId: number) =>
				Effect.acquireRelease(
					Effect.gen(function* () {
						if (TokenId <= 0) {
							return yield* new InvalidTokenIdProblem({
								TokenId,
							});
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
							`Disposing all (${HashMap.size(
								TheMap,
							)}) managed CancellationTokenSources.`,
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

			yield* Effect.addFinalizer(() => DisposeAll());

			return {
				ObtainToken,
				CancelToken,
				DisposeAll,
			};
		}),
	},
) {}
