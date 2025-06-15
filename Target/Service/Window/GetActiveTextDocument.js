import { Effect, Option } from "effect";
import WindowService from "./Service.js";
const GetActiveTextDocument = Effect.gen(function* () {
  const Window = yield* WindowService;
  return Option.fromNullable(Window.activeTextEditor?.document);
});
var GetActiveTextDocument_default = GetActiveTextDocument;
export {
  GetActiveTextDocument_default as default
};
//# sourceMappingURL=GetActiveTextDocument.js.map
