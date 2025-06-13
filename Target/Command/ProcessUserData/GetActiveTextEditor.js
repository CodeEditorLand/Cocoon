import { Effect, Option } from "effect";
import { Window } from "../../Service/Window.js";
const GetActiveTextEditor = Effect.gen(function* (_) {
  const WindowService = yield* _(Window.Tag);
  return Option.fromNullable(WindowService.activeTextEditor);
});
export {
  GetActiveTextEditor
};
//# sourceMappingURL=GetActiveTextEditor.js.map
