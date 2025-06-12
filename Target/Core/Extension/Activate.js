import { Effect } from "effect";
import { GetConfiguration } from "../../Service/Configuration/GetConfiguration.js";
import { ShowInformationMessage } from "../../Service/Window/ShowInformationMessage.js";
const Activate = Effect.gen(function* (_) {
  const Configuration = yield* _(GetConfiguration("cocoon"));
  const ShouldShowWelcomeMessage = Configuration.get(
    "showWelcomeMessage",
    true
  );
  yield* _(Effect.logInfo("Cocoon extension is now active."));
  yield* _(
    Effect.when(
      ShowInformationMessage("Welcome to Cocoon!"),
      () => ShouldShowWelcomeMessage
    )
  );
});
export {
  Activate
};
//# sourceMappingURL=Activate.js.map
