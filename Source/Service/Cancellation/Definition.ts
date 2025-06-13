/**
 * @module Definition (Cancellation)
 * @description The live implementation of the CancellationTokenProvider service.
 */

import { Effect, HashMap, Ref, Scope } from "effect";
import { CancellationTokenSource } from "vs/base/common/cancellation.js";

import { InvalidTokenIDError } from "./Error.js";
import type { Interface } from "./Service.js";

/**
 * An Effect that builds the live implementation of the CancellationTokenProvider service.
 */
export const Definition = Effect.gen(function* (_) {
	const SourceMap = yield* _(
		Ref.make(HashMap.empty<number, CancellationTokenSource>()),
	);

	const ObtainToken = (TokenID: number) =>
		Effect.acquireRelease(
			Effect.gen(function* (_) {
				if (TokenID <= 0) {
					return yield* _(
						Effect.fail(new InvalidTokenIDError({ TokenID })),
					);
				}

				const ExistingSource = yield* _(
					Ref.get(SourceMap),
					Effect.map(HashMap.get(TokenID)),
				);
				if (ExistingSource._tag === "Some") {
					yield* _(
						Effect.logTrace(
							`Reusing CancellationTokenSource for TokenID: ${TokenID}.`,
						),
					);
					return ExistingSource.value;
				}

				const NewSource = new CancellationTokenSource();
				yield* _(
					Ref.update(SourceMap, HashMap.set(TokenID, NewSource)),
				);
				yield* _(
					Effect.logTrace(
						`Created new CancellationTokenSource for TokenID: ${TokenID}.`,
					),
				);
				return NewSource;
			}),
			(Source) =>
				Ref.get(SourceMap).pipe(
					Effect.flatMap((map) => {
						const CurrentSource = HashMap.get(map, TokenID);
						// Only dispose and remove if it's the exact same source instance.
						if (
							CurrentSource._tag === "Some" &&
							CurrentSource.value === Source
						) {
							return Ref.update(
								SourceMap,
								HashMap.remove(TokenID),
							).pipe(
								Effect.tap(() => {
									Source.dispose();
									return Effect.logTrace(
										`Disposed and removed CancellationTokenSource for TokenID: ${TokenID}.`,
									);
								}),
							);
						}
						return Effect.unit;
					}),
					Effect.orDie, // Failure to release is a fatal error.
				),
		).pipe(
			// The scope is implicitly created and managed by acquireRelease
			Effect.map((Source) => ({
				Token: Source.token,
				Scope: Scope.global, // Placeholder, acquireRelease provides its own scope.
			})),
		);

	const CancelToken = (TokenID: number) =>
		Effect.gen(function* (_) {
			if (TokenID <= 0) {
				return yield* _(
					Effect.logWarning(
						`Attempted to cancel with an invalid TokenID: '${TokenID}'.`,
					),
				);
			}
			const MaybeSource = yield* _(
				Ref.get(SourceMap),
				Effect.map(HashMap.get(TokenID)),
			);
			if (MaybeSource._tag === "Some") {
				yield* _(
					Effect.logDebug(
						`Received cancellation signal. Cancelling operation for TokenID: ${TokenID}.`,
					),
				);
				MaybeSource.value.cancel();
			} else {
				yield* _(
					Effect.logWarning(
						`Cancellation signal for TokenID: ${TokenID}, but no active source was found.`,
					),
				);
			}
		});

	const DisposeAll = Ref.get(SourceMap).pipe(
		Effect.tap((map) =>
			Effect.logDebug(
				`Disposing all (${HashMap.size(map)}) managed CancellationTokenSources.`,
			),
		),
		Effect.flatMap((map) =>
			Effect.forEach(
				HashMap.values(map),
				(source) => Effect.sync(() => source.dispose()),
				{
					discard: true,
					concurrency: "unbounded",
				},
			),
		),
		Effect.flatMap(() => Ref.set(SourceMap, HashMap.empty())),
		Effect.tap(() =>
			Effect.logTrace(
				"All CancellationTokenSources disposed and map cleared.",
			),
		),
	);

	const ServiceImplementation: Interface = {
		ObtainToken,
		CancelToken,
		DisposeAll: () => DisposeAll,
	};

	return ServiceImplementation;
});
