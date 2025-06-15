import { Effect } from "effect";
import ExitPreventedError from "./Error/ExitPreventedError.js";
import ProcessPatchService from "./ProcessPatch/Service.js";
const PatchProcessExit = Effect.gen(function* () {
  const ProcessPatch = yield* ProcessPatchService;
  process.exit = (Code) => {
    if (ProcessPatch.AllowExit()) {
      Effect.runSync(
        Effect.logInfo(
          `'process.exit(${Code ?? ""})' was called and ALLOWED by host policy. Terminating.`
        )
      );
      return ProcessPatch.NativeExit(Code);
    }
    const ErrorMessage = `'process.exit(${Code ?? ""})' was called but PREVENTED by host policy.`;
    const PreventionError = new ExitPreventedError({
      message: ErrorMessage,
      AttemptedCode: Code
    });
    Effect.runSync(
      Effect.logWarning(
        "Blocked call to process.exit by host policy.",
        PreventionError
      )
    );
    throw PreventionError;
  };
  yield* Effect.logTrace("Successfully patched 'process.exit'.");
});
var PatchProcessExit_default = PatchProcessExit;
export {
  PatchProcessExit_default as default
};
//# sourceMappingURL=PatchProcessExit.js.map
