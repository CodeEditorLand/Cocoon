import { Effect, Option } from "effect";
import WindowService from "../../Service/Window/Service.js";
var GetActiveTextEditor_default = Effect.gen(function* () {
  const Window = yield* WindowService;
  return Option.fromNullable(Window.activeTextEditor);
});
export {
  GetActiveTextEditor_default as default
};
//# sourceMappingURL=GetActiveTextEditor.js.map
