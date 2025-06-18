var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, HashMap, Ref } from "effect";
import { CancellationTokenSource } from "vs/base/common/cancellation.js";
import InvalidTokenIDError from "./Error/InvalidTokenIDError.js";
var Definition_default = Effect.gen(function* () {
  const SourceMap = yield* Ref.make(
    HashMap.empty()
  );
  const ObtainToken = /* @__PURE__ */ __name((TokenID) => {
    const acquireAndReleaseToken = Effect.acquireRelease(
      Effect.gen(function* () {
        if (TokenID <= 0) {
          return yield* Effect.fail(
            new InvalidTokenIDError({ TokenID })
          );
        }
        const existingSource = yield* Ref.get(SourceMap).pipe(
          Effect.map(HashMap.get(TokenID))
        );
        if (existingSource._tag === "Some") {
          yield* Effect.logTrace(
            `Reusing CancellationTokenSource for TokenID: ${TokenID}.`
          );
          return existingSource.value;
        }
        const newSource = new CancellationTokenSource();
        yield* Ref.update(SourceMap, HashMap.set(TokenID, newSource));
        yield* Effect.logTrace(
          `Created new CancellationTokenSource for TokenID: ${TokenID}.`
        );
        return newSource;
      }),
      (source) => Ref.get(SourceMap).pipe(
        Effect.flatMap((map) => {
          const currentSource = HashMap.get(map, TokenID);
          if (currentSource._tag === "Some" && currentSource.value === source) {
            return Ref.update(
              SourceMap,
              HashMap.remove(TokenID)
            ).pipe(
              Effect.tap(() => {
                source.dispose();
                return Effect.logTrace(
                  `Disposed and removed CancellationTokenSource for TokenID: ${TokenID}.`
                );
              })
            );
          }
          return Effect.void;
        }),
        Effect.orDie
        // Failure to release is a fatal error.
      )
    ).pipe(Effect.map((source) => source.token));
    return Effect.scoped(acquireAndReleaseToken);
  }, "ObtainToken");
  const CancelToken = /* @__PURE__ */ __name((TokenID) => Effect.gen(function* () {
    if (TokenID <= 0) {
      return yield* Effect.logWarning(
        `Attempted to cancel with an invalid TokenID: '${TokenID}'.`
      );
    }
    const maybeSource = yield* Ref.get(SourceMap).pipe(
      Effect.map(HashMap.get(TokenID))
    );
    if (maybeSource._tag === "Some") {
      yield* Effect.logDebug(
        `Received cancellation signal. Cancelling operation for TokenID: ${TokenID}.`
      );
      maybeSource.value.cancel();
    } else {
      yield* Effect.logWarning(
        `Cancellation signal for TokenID: ${TokenID}, but no active source was found.`
      );
    }
  }), "CancelToken");
  const DisposeAll = /* @__PURE__ */ __name(() => Ref.get(SourceMap).pipe(
    Effect.tap(
      (map) => Effect.logDebug(
        `Disposing all (${HashMap.size(
          map
        )}) managed CancellationTokenSources.`
      )
    ),
    Effect.flatMap(
      (map) => Effect.forEach(
        HashMap.values(map),
        (source) => Effect.sync(() => source.dispose()),
        { discard: true, concurrency: "unbounded" }
      )
    ),
    Effect.flatMap(() => Ref.set(SourceMap, HashMap.empty())),
    Effect.tap(
      () => Effect.logTrace(
        "All CancellationTokenSources disposed and map cleared."
      )
    )
  ), "DisposeAll");
  yield* Effect.addFinalizer(() => DisposeAll());
  const ServiceImplementation = {
    ObtainToken,
    CancelToken,
    DisposeAll
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
