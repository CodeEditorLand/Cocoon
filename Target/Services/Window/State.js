var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Window/State.ts
import { Effect, Ref, Context } from "effect";
var WindowStateService = Context.Tag(
  "Service/Window/State"
);
var WindowStateLive = Effect.gen(function* () {
  const Logger = yield* Effect.serviceOption(Logger);
  const stateRef = yield* Ref.make({
    focused: true,
    active: true
  });
  const getState = Ref.get(stateRef);
  const setState = /* @__PURE__ */ __name((newState) => Effect.gen(function* () {
    const currentState = yield* getState;
    if (currentState.focused !== newState.focused || currentState.active !== newState.active) {
      yield* Logger.pipe(
        Effect.map(
          (logger) => logger.Info(
            `[WindowState] State changed: focused=${newState.focused}, active=${newState.active}`
          )
        ),
        Effect.orElse(() => Effect.void)
      );
    }
    yield* Ref.set(stateRef, newState);
    return newState;
  }), "setState");
  const onStateChange = Effect.void;
  return WindowStateService.of({
    getState,
    setState,
    onStateChange
  });
});
var WindowStateLayer = Layer.effect(
  WindowStateService,
  WindowStateLive
);
export {
  WindowStateLayer,
  WindowStateLive,
  WindowStateService
};
//# sourceMappingURL=State.js.map
