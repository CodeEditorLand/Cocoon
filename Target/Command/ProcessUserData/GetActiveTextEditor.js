import { Effect, Option } from "effect";
import WindowService from "../../Service/Window/Service.js";
const GetActiveTextEditor = Effect.gen(function* () {
  const Window = yield* WindowService;
  return Option.fromNullable(Window.activeTextEditor);
});
var GetActiveTextEditor_default = GetActiveTextEditor;
export {
  GetActiveTextEditor_default as default
};
//# sourceMappingURL=GetActiveTextEditor.js.map
