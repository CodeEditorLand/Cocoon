import { Effect } from "effect";
import GetConfiguration from "../../Service/Configuration/GetConfiguration.js";
import ShowInformationMessage from "../../Service/Window/ShowInformationMessage.js";
var Activate_default = Effect.gen(function* () {
  const Configuration = yield* GetConfiguration("cocoon");
  const ShouldShowWelcomeMessage = Configuration.get(
    "showWelcomeMessage",
    true
  );
  yield* Effect.logInfo("Cocoon extension is now active.");
  yield* Effect.when(
    ShowInformationMessage("Welcome to Cocoon!"),
    () => ShouldShowWelcomeMessage
  );
});
export {
  Activate_default as default
};
//# sourceMappingURL=Activate.js.map
