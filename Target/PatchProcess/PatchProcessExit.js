import { Effect } from "effect";
import { ExitPreventedError } from "./Error/mod.js";
import { ProcessPatch } from "./ProcessPatch/mod.js";
const PatchProcessExit = Effect.gen(function* (_) {
  const { NativeExit, AllowExit } = yield* _(ProcessPatch.Tag);
  process.exit = (Code) => {
    if (AllowExit()) {
      Effect.runSync(
        Effect.logInfo(
          `'process.exit(${Code ?? ""})' was called and ALLOWED by host policy. Terminating.`
        )
      );
      return NativeExit(Code);
    }
    const ErrorMessage = `'process.exit(${Code ?? ""})' was called but PREVENTED by host policy.`;
    const PreventionError = new ExitPreventedError({
      message: ErrorMessage,
      attemptedCode: Code
    });
    Effect.runSync(
      Effect.logWarning(
        "Blocked call to process.exit by host policy.",
        PreventionError
      )
    );
    throw PreventionError;
  };
  yield* _(Effect.logTrace("Successfully patched 'process.exit'."));
});
export {
  PatchProcessExit
};
//# sourceMappingURL=PatchProcessExit.js.map
