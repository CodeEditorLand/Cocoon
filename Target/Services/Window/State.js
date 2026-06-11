var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Window/State.ts
import { Context, Effect, Layer } from "effect";
var WindowStateService = Context.Tag(
  "Service/Window/State"
);
function makeWindowStateService() {
  let _state = { focused: true, active: true };
  return WindowStateService.of({
    getState: Effect.suspend(() => Effect.succeed(_state)),
    setState: /* @__PURE__ */ __name((newState) => Effect.sync(() => {
      _state = newState;
      return newState;
    }), "setState"),
    onStateChange: Effect.void
  });
}
__name(makeWindowStateService, "makeWindowStateService");
var WindowStateLive = Effect.succeed(makeWindowStateService());
var WindowStateLayer = Layer.succeed(
  WindowStateService,
  makeWindowStateService()
);
export {
  WindowStateLayer,
  WindowStateLive,
  WindowStateService
};
//# sourceMappingURL=State.js.map
