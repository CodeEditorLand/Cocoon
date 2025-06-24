/*
 * File: Cocoon/Source/Service/Cancellation/Service.ts
 * Role: Defines the Cancellation service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Manage cancellation tokens for long-running RPC operations.
 *   - Provide a scoped, self-managing service layer.
 */

import { Effect, HashMap, Ref } from "effect";
import { CancellationTokenSource } from "vs/base/common/cancellation.js";
import { InvalidTokenIDError } from "./Error/InvalidTokenIDError.js";

export class Cancellation extends Effect.Service<Cancellation>()(
	"Service/CancellationTokenProvider",
	{
		// `scoped` is used because the service manages resources (token sources)
		// that must be cleaned up on shutdown. The `addFinalizer` call requires a scope.
		scoped: Effect.gen(function* (Generator) {
			const SourceMap = yield* Generator(
				Ref.make(HashMap.empty<number, CancellationTokenSource>()),
			);

			const ObtainToken = (TokenID: number) => {
				const AcquireAndReleaseToken = Effect.acquireRelease(
					Effect.gen(function* (Generator) {
						if (TokenID <= 0) {
							return yield* Generator(
								new InvalidTokenIDError({ TokenID }),
							);
						}
						const ExistingSource = yield* Generator(
							Ref.get(SourceMap).pipe(
								Effect.map(HashMap.get(TokenID)),
							),
						);
						if (ExistingSource._tag === "Some") {
							yield* Generator(
								Effect.logTrace(
									`Reusing CancellationTokenSource for TokenID: ${TokenID}.`,
								),
							);
							return ExistingSource.value;
						}
						const NewSource = new CancellationTokenSource();
						yield* Generator(
							Ref.update(
								SourceMap,
								HashMap.set(TokenID, NewSource),
							),
						);
						yield* Generator(
							Effect.logTrace(
								`Created new CancellationTokenSource for TokenID: ${TokenID}.`,
							),
						);
						return NewSource;
					}),
					(Source) =>
						Ref.get(SourceMap).pipe(
							Effect.flatMap((TheMap) => {
								const CurrentSource = HashMap.get(
									TheMap,
									TokenID,
								);
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
								return Effect.void;
							}),
							Effect.orDie,
						),
				).pipe(Effect.map((Source) => Source.token));

				return Effect.scoped(AcquireAndReleaseToken);
			};

			const CancelToken = (TokenID: number) =>
				Effect.gen(function* (Generator) {
					if (TokenID <= 0) {
						return yield* Generator(
							Effect.logWarning(
								`Attempted to cancel with an invalid TokenID: '${TokenID}'.`,
							),
						);
					}
					const MaybeSource = yield* Generator(
						Ref.get(SourceMap).pipe(
							Effect.map(HashMap.get(TokenID)),
						),
					);
					if (MaybeSource._tag === "Some") {
						yield* Generator(
							Effect.logDebug(
								`Received cancellation signal. Cancelling operation for TokenID: ${TokenID}.`,
							),
						);
						MaybeSource.value.cancel();
					} else {
						yield* Generator(
							Effect.logWarning(
								`Cancellation signal for TokenID: ${TokenID}, but no active source was found.`,
							),
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
							{ discard: true, concurrency: "unbounded" }, // FIXED: Removed stray comma
						),
					),
					Effect.flatMap(() => Ref.set(SourceMap, HashMap.empty())),
					Effect.tap(() =>
						Effect.logTrace(
							"All CancellationTokenSources disposed and map cleared.",
						),
					),
				);

			// Register a finalizer for the service's own scope.
			yield* Generator(Effect.addFinalizer(() => DisposeAll()));

			const ServiceImplementation = {
				ObtainToken,
				CancelToken,
				DisposeAll,
			};

			return ServiceImplementation;
		}),
	},
) {}
