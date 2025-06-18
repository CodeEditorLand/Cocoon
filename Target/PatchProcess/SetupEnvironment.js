import { Effect } from "effect";
import InitDataService from "../Service/InitData/Service.js";
const SetupEnvironment = Effect.gen(function* () {
  const InitData = yield* InitDataService;
  if (InitData.environment.useHostProxy) {
    yield* Effect.logInfo(
      "Host proxy is enabled. Assuming proxy environment variables are inherited."
    );
  }
}).pipe(
  Effect.tap(
    () => Effect.logTrace("Proxy environment variables configured.")
  )
);
var SetupEnvironment_default = SetupEnvironment;
export {
  SetupEnvironment_default as default
};
//# sourceMappingURL=SetupEnvironment.js.map
