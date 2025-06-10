/**
 * @module Definition (Cancellation)
 * @description The live implementation of the CancellationTokenProvider service.
 */

import { Effect, HashMap, Ref, Scope } from "effect";
import { CancellationTokenSource } from "vs/base/common/cancellation.js";

import { InvalidTokenIdError } from "./Error.js";
import type { Interface } from "./Service.js";

/**
 * An Effect that builds the live implementation of the CancellationTokenProvider service.
 */
export const Definition = Effect.gen(function* (_) {
	const SourceMap = yield* _(
		Ref.make(HashMap.empty<number, CancellationTokenSource>()),
	);

	const ObtainToken = (TokenId: number) =>
		Effect.acquireRelease(
			Effect.gen(function* (_) {
				if (TokenId <= 0) {
					return yield* _(
						Effect.fail(
							new InvalidTokenIdError({ tokenId: TokenId }),
						),
					);
				}

				const ExistingSource = yield* _(
					Ref.get(SourceMap),
					Effect.map(HashMap.get(TokenId)),
				);
				if (ExistingSource.isSome()) {
					yield* _(
						Effect.logTrace(
							`Reusing CancellationTokenSource for TokenId: ${TokenId}.`,
						),
					);
					return ExistingSource.value;
				}

				const NewSource = new CancellationTokenSource();
				yield* _(
					Ref.update(SourceMap, HashMap.set(TokenId, NewSource)),
				);
				yield* _(
					Effect.logTrace(
						`Created new CancellationTokenSource for TokenId: ${TokenId}.`,
					),
				);
				return NewSource;
			}),
			(Source) =>
				Ref.get(SourceMap).pipe(
					Effect.flatMap((map) => {
						const CurrentSource = HashMap.get(map, TokenId);
						// Only dispose and remove if it's the exact same source instance.
						if (
							CurrentSource.isSome() &&
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
						return Effect.unit;
					}),
					Effect.orDie, // Failure to release is a fatal error.
				),
		).pipe(
			Effect.map((Source) => ({
				Token: Source.token,
				Scope: Scope.make(), // A new scope is implicitly created and returned by acquireRelease
			})),
		);

	const CancelToken = (TokenId: number) =>
		Effect.gen(function* (_) {
			if (TokenId <= 0) {
				return yield* _(
					Effect.logWarning(
						`Attempted to cancel with an invalid TokenId: '${TokenId}'.`,
					),
				);
			}
			const MaybeSource = yield* _(
				Ref.get(SourceMap),
				Effect.map(HashMap.get(TokenId)),
			);
			if (MaybeSource.isSome()) {
				yield* _(
					Effect.logDebug(
						`Received cancellation signal. Cancelling operation for TokenId: ${TokenId}.`,
					),
				);
				MaybeSource.value.cancel();
			} else {
				yield* _(
					Effect.logWarning(
						`Cancellation signal for TokenId: ${TokenId}, but no active source was found.`,
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
				{ discard: true },
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
