import { Effect, Option } from "effect";
import WindowService from "./Service.js";
var GetActiveTextDocument_default = Effect.gen(function* () {
  const Window = yield* WindowService;
  return Option.fromNullable(Window.activeTextEditor?.document);
});
export {
  GetActiveTextDocument_default as default
};
//# sourceMappingURL=GetActiveTextDocument.js.map
