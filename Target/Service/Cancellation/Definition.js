var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, HashMap, Ref, Scope } from "effect";
import { CancellationTokenSource } from "vs/base/common/cancellation.js";
import { InvalidTokenIdError } from "./Error.js";
const Definition = Effect.gen(function* (_) {
  const SourceMap = yield* _(
    Ref.make(HashMap.empty())
  );
  const ObtainToken = /* @__PURE__ */ __name((TokenId) => Effect.acquireRelease(
    Effect.gen(function* (_2) {
      if (TokenId <= 0) {
        return yield* _2(
          Effect.fail(
            new InvalidTokenIdError({ tokenId: TokenId })
          )
        );
      }
      const ExistingSource = yield* _2(
        Ref.get(SourceMap),
        Effect.map(HashMap.get(TokenId))
      );
      if (ExistingSource.isSome()) {
        yield* _2(
          Effect.logTrace(
            `Reusing CancellationTokenSource for TokenId: ${TokenId}.`
          )
        );
        return ExistingSource.value;
      }
      const NewSource = new CancellationTokenSource();
      yield* _2(
        Ref.update(SourceMap, HashMap.set(TokenId, NewSource))
      );
      yield* _2(
        Effect.logTrace(
          `Created new CancellationTokenSource for TokenId: ${TokenId}.`
        )
      );
      return NewSource;
    }),
    (Source) => Ref.get(SourceMap).pipe(
      Effect.flatMap((map) => {
        const CurrentSource = HashMap.get(map, TokenId);
        if (CurrentSource.isSome() && CurrentSource.value === Source) {
          return Ref.update(
            SourceMap,
            HashMap.remove(TokenId)
          ).pipe(
            Effect.tap(() => {
              Source.dispose();
              return Effect.logTrace(
                `Disposed and removed CancellationTokenSource for TokenId: ${TokenId}.`
              );
            })
          );
        }
        return Effect.unit;
      }),
      Effect.orDie
      // Failure to release is a fatal error.
    )
  ).pipe(
    Effect.map((Source) => ({
      Token: Source.token,
      Scope: Scope.make()
      // A new scope is implicitly created and returned by acquireRelease
    }))
  ), "ObtainToken");
  const CancelToken = /* @__PURE__ */ __name((TokenId) => Effect.gen(function* (_2) {
    if (TokenId <= 0) {
      return yield* _2(
        Effect.logWarning(
          `Attempted to cancel with an invalid TokenId: '${TokenId}'.`
        )
      );
    }
    const MaybeSource = yield* _2(
      Ref.get(SourceMap),
      Effect.map(HashMap.get(TokenId))
    );
    if (MaybeSource.isSome()) {
      yield* _2(
        Effect.logDebug(
          `Received cancellation signal. Cancelling operation for TokenId: ${TokenId}.`
        )
      );
      MaybeSource.value.cancel();
    } else {
      yield* _2(
        Effect.logWarning(
          `Cancellation signal for TokenId: ${TokenId}, but no active source was found.`
        )
      );
    }
  }), "CancelToken");
  const DisposeAll = Ref.get(SourceMap).pipe(
    Effect.tap(
      (map) => Effect.logDebug(
        `Disposing all (${HashMap.size(map)}) managed CancellationTokenSources.`
      )
    ),
    Effect.flatMap(
      (map) => Effect.forEach(
        HashMap.values(map),
        (source) => Effect.sync(() => source.dispose()),
        { discard: true }
      )
    ),
    Effect.flatMap(() => Ref.set(SourceMap, HashMap.empty())),
    Effect.tap(
      () => Effect.logTrace(
        "All CancellationTokenSources disposed and map cleared."
      )
    )
  );
  const ServiceImplementation = {
    ObtainToken,
    CancelToken,
    DisposeAll: /* @__PURE__ */ __name(() => DisposeAll, "DisposeAll")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
