var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { CancellationTokenSource } from "@codeeditorland/output/vs/base/common/cancellation.js";
import { Effect, HashMap, Ref } from "effect";
import { InvalidTokenIdProblem } from "./Cancellation/InvalidTokenIdProblem.js";
class CancellationService extends Effect.Service()(
  "Service/Cancellation",
  {
    scoped: Effect.gen(function* () {
      const SourceMap = yield* Ref.make(
        HashMap.empty()
      );
      const ObtainToken = /* @__PURE__ */ __name((TokenId) => Effect.acquireRelease(
        Effect.gen(function* () {
          if (TokenId <= 0) {
            return yield* new InvalidTokenIdProblem({
              TokenId
            });
          }
          const ExistingSource = yield* Ref.get(SourceMap).pipe(
            Effect.map(HashMap.get(TokenId))
          );
          if (ExistingSource._tag === "Some") {
            yield* Effect.logTrace(
              `Reusing CancellationTokenSource for TokenId: ${TokenId}.`
            );
            return ExistingSource.value;
          }
          const NewSource = new CancellationTokenSource();
          yield* Ref.update(
            SourceMap,
            HashMap.set(TokenId, NewSource)
          );
          yield* Effect.logTrace(
            `Created new CancellationTokenSource for TokenId: ${TokenId}.`
          );
          return NewSource;
        }),
        (Source) => Ref.get(SourceMap).pipe(
          Effect.flatMap((TheMap) => {
            const CurrentSource = HashMap.get(
              TheMap,
              TokenId
            );
            if (CurrentSource._tag === "Some" && CurrentSource.value === Source) {
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
            return Effect.void;
          }),
          Effect.orDie
        )
      ).pipe(Effect.map((Source) => Source.token)), "ObtainToken");
      const CancelToken = /* @__PURE__ */ __name((TokenId) => Effect.gen(function* () {
        if (TokenId <= 0) {
          return yield* Effect.logWarning(
            `Attempted to cancel with an invalid TokenId: '${TokenId}'.`
          );
        }
        const MaybeSource = yield* Ref.get(SourceMap).pipe(
          Effect.map(HashMap.get(TokenId))
        );
        if (MaybeSource._tag === "Some") {
          yield* Effect.logDebug(
            `Received cancellation signal. Cancelling operation for TokenId: ${TokenId}.`
          );
          MaybeSource.value.cancel();
        } else {
          yield* Effect.logWarning(
            `Cancellation signal for TokenId: ${TokenId}, but no active source was found.`
          );
        }
      }), "CancelToken");
      const DisposeAll = /* @__PURE__ */ __name(() => Ref.get(SourceMap).pipe(
        Effect.tap(
          (TheMap) => Effect.logDebug(
            `Disposing all (${HashMap.size(
              TheMap
            )}) managed CancellationTokenSources.`
          )
        ),
        Effect.flatMap(
          (TheMap) => Effect.forEach(
            HashMap.values(TheMap),
            (Source) => Effect.sync(() => Source.dispose()),
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
      return {
        ObtainToken,
        CancelToken,
        DisposeAll
      };
    })
  }
) {
  static {
    __name(this, "CancellationService");
  }
}
export {
  CancellationService
};
//# sourceMappingURL=Cancellation.js.map
