/*
 * File: Cocoon/Source/Service/Cancellation/Definition.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:32 UTC
 * Dependency: ./Error/InvalidTokenIDError.js, ./Service.js, effect, vs/base/common/cancellation.js
 */

/**
 * @module Definition (Cancellation)
 * @description The live implementation of the CancellationTokenProvider service.
 */

import { Effect, HashMap, Ref } from "effect";
import { CancellationTokenSource } from "vs/base/common/cancellation.js";

import InvalidTokenIDError from "./Error/InvalidTokenIDError.js";
import type Service from "./Service.js";

/**
 * An Effect that builds the live implementation of the CancellationTokenProvider service.
 */
export default Effect.gen(function* () {
	const SourceMap = yield* Ref.make(
		HashMap.empty<number, CancellationTokenSource>(),
	);

	// `ObtainToken` now encapsulates its scope management.
	const ObtainToken = (TokenID: number) => {
		// Define the scoped effect that acquires and releases the token source.
		const acquireAndReleaseToken = Effect.acquireRelease(
			Effect.gen(function* () {
				if (TokenID <= 0) {
					return yield* Effect.fail(
						new InvalidTokenIDError({ TokenID }),
					);
				}

				const existingSource = yield* Ref.get(SourceMap).pipe(
					Effect.map(HashMap.get(TokenID)),
				);
				if (existingSource._tag === "Some") {
					yield* Effect.logTrace(
						`Reusing CancellationTokenSource for TokenID: ${TokenID}.`,
					);
					return existingSource.value;
				}

				const newSource = new CancellationTokenSource();
				yield* Ref.update(SourceMap, HashMap.set(TokenID, newSource));
				yield* Effect.logTrace(
					`Created new CancellationTokenSource for TokenID: ${TokenID}.`,
				);
				return newSource;
			}),
			(source) =>
				Ref.get(SourceMap).pipe(
					Effect.flatMap((map) => {
						const currentSource = HashMap.get(map, TokenID);
						if (
							currentSource._tag === "Some" &&
							currentSource.value === source
						) {
							return Ref.update(
								SourceMap,
								HashMap.remove(TokenID),
							).pipe(
								Effect.tap(() => {
									source.dispose();
									return Effect.logTrace(
										`Disposed and removed CancellationTokenSource for TokenID: ${TokenID}.`,
									);
								}),
							);
						}
						return Effect.void;
					}),
					Effect.orDie, // Failure to release is a fatal error.
				),
		).pipe(Effect.map((source) => source.token)); // Only return the token

		// Use Effect.scoped to run the acquire/release logic in a temporary,
		// self-contained scope that is closed when the consumer's effect ends.
		return Effect.scoped(acquireAndReleaseToken);
	};

	const CancelToken = (TokenID: number) =>
		Effect.gen(function* () {
			if (TokenID <= 0) {
				return yield* Effect.logWarning(
					`Attempted to cancel with an invalid TokenID: '${TokenID}'.`,
				);
			}
			const maybeSource = yield* Ref.get(SourceMap).pipe(
				Effect.map(HashMap.get(TokenID)),
			);
			if (maybeSource._tag === "Some") {
				yield* Effect.logDebug(
					`Received cancellation signal. Cancelling operation for TokenID: ${TokenID}.`,
				);
				maybeSource.value.cancel();
			} else {
				yield* Effect.logWarning(
					`Cancellation signal for TokenID: ${TokenID}, but no active source was found.`,
				);
			}
		});

	const DisposeAll = () =>
		Ref.get(SourceMap).pipe(
			Effect.tap((map) =>
				Effect.logDebug(
					`Disposing all (${HashMap.size(
						map,
					)}) managed CancellationTokenSources.`,
				),
			),
			Effect.flatMap((map) =>
				Effect.forEach(
					HashMap.values(map),
					(source) => Effect.sync(() => source.dispose()),
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

	// Register DisposeAll as a finalizer for the service's own scope.
	// This ensures cleanup happens automatically when the application shuts down.
	yield* Effect.addFinalizer(() => DisposeAll());

	const ServiceImplementation: Service["Type"] = {
		ObtainToken,
		CancelToken,
		DisposeAll,
	};

	return ServiceImplementation;
});
