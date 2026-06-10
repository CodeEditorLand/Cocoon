var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Window/Dialog.ts
import { Context, Effect, Layer } from "effect";
var DialogService = Context.Tag(
  "Service/Window/Dialog"
);
var DialogLive = Effect.gen(function* () {
  const ShowInformationMessage = /* @__PURE__ */ __name((message, items = []) => Effect.gen(function* () {
    return void 0;
  }), "ShowInformationMessage");
  const ShowWarningMessage = /* @__PURE__ */ __name((message, items = []) => Effect.gen(function* () {
    return void 0;
  }), "ShowWarningMessage");
  const ShowErrorMessage = /* @__PURE__ */ __name((message, items = []) => Effect.gen(function* () {
    return void 0;
  }), "ShowErrorMessage");
  return DialogService.of({
    ShowInformationMessage,
    ShowWarningMessage,
    ShowErrorMessage
  });
});
var DialogLayer = Layer.effect(DialogService, DialogLive);
export {
  DialogLayer,
  DialogLive,
  DialogService
};
//# sourceMappingURL=Dialog.js.map
