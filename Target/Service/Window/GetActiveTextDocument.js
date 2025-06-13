import { Effect, Option } from "effect";
import { Window } from "./Service.js";
const GetActiveTextDocument = Effect.gen(function* (_) {
  const WindowService = yield* _(Window.Tag);
  return Option.fromNullable(WindowService.activeTextEditor?.document);
});
export {
  GetActiveTextDocument
};
//# sourceMappingURL=GetActiveTextDocument.js.map
