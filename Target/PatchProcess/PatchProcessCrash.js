import { Effect } from "effect";
import { ProcessPatch } from "./ProcessPatch.js";
const PatchProcessCrash = Effect.gen(function* (_) {
  const { NativeCrash } = yield* _(ProcessPatch.Tag);
  if (NativeCrash) {
    process.crash = () => {
      const PreventionStack = new Error(
        "Stack trace for prevented process.crash()"
      ).stack;
      Effect.runSync(
        Effect.logWarning(
          `A call to 'process.crash()' was intercepted and PREVENTED by host policy.`,
          `Call stack for prevented crash:
${PreventionStack ?? "(Stack trace unavailable)"}`
        )
      );
    };
    yield* _(Effect.logTrace("Successfully patched 'process.crash'."));
  } else {
    yield* _(
      Effect.logTrace(
        "'process.crash()' not found in this environment, skipping patch."
      )
    );
  }
});
export {
  PatchProcessCrash
};
//# sourceMappingURL=PatchProcessCrash.js.map
