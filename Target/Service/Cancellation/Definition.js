var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, HashMap, Ref, Scope } from "effect";
import { CancellationTokenSource } from "vs/base/common/cancellation.js";
import InvalidTokenIDError from "./Error/InvalidTokenIDError.js";
var Definition_default = Effect.gen(function* () {
  const SourceMap = yield* Ref.make(
    HashMap.empty()
  );
  const ObtainToken = /* @__PURE__ */ __name((TokenID) => Effect.acquireRelease(
    Effect.gen(function* () {
      if (TokenID <= 0) {
        return yield* Effect.fail(
          new InvalidTokenIDError({ TokenID })
        );
      }
      const ExistingSource = yield* Effect.map(
        Ref.get(SourceMap),
        HashMap.get(TokenID)
      );
      if (ExistingSource._tag === "Some") {
        yield* Effect.logTrace(
          `Reusing CancellationTokenSource for TokenID: ${TokenID}.`
        );
        return ExistingSource.value;
      }
      const NewSource = new CancellationTokenSource();
      yield* Ref.update(SourceMap, HashMap.set(TokenID, NewSource));
      yield* Effect.logTrace(
        `Created new CancellationTokenSource for TokenID: ${TokenID}.`
      );
      return NewSource;
    }),
    (Source) => Ref.get(SourceMap).pipe(
      Effect.flatMap((map) => {
        const CurrentSource = HashMap.get(map, TokenID);
        if (CurrentSource._tag === "Some" && CurrentSource.value === Source) {
          return Ref.update(
            SourceMap,
            HashMap.remove(TokenID)
          ).pipe(
            Effect.tap(() => {
              Source.dispose();
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
  ).pipe(
    // The scope is implicitly created and managed by acquireRelease
    Effect.map((Source) => ({
      Token: Source.token,
      Scope: Scope.globalScope
      // Placeholder, acquireRelease provides its own scope.
    }))
  ), "ObtainToken");
  const CancelToken = /* @__PURE__ */ __name((TokenID) => Effect.gen(function* () {
    if (TokenID <= 0) {
      return yield* Effect.logWarning(
        `Attempted to cancel with an invalid TokenID: '${TokenID}'.`
      );
    }
    const MaybeSource = yield* Effect.map(
      Ref.get(SourceMap),
      HashMap.get(TokenID)
    );
    if (MaybeSource._tag === "Some") {
      yield* Effect.logDebug(
        `Received cancellation signal. Cancelling operation for TokenID: ${TokenID}.`
      );
      MaybeSource.value.cancel();
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
        {
          discard: true,
          concurrency: "unbounded"
        }
      )
    ),
    Effect.flatMap(() => Ref.set(SourceMap, HashMap.empty())),
    Effect.tap(
      () => Effect.logTrace(
        "All CancellationTokenSources disposed and map cleared."
      )
    )
  ), "DisposeAll");
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
