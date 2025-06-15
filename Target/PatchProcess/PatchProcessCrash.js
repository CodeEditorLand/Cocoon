import { Effect } from "effect";
import ProcessPatchService from "./ProcessPatch/Service.js";
const PatchProcessCrash = Effect.gen(function* () {
  const ProcessPatch = yield* ProcessPatchService;
  if (ProcessPatch.NativeCrash) {
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
    yield* Effect.logTrace("Successfully patched 'process.crash'.");
  } else {
    yield* Effect.logTrace(
      "'process.crash()' not found in this environment, skipping patch."
    );
  }
});
var PatchProcessCrash_default = PatchProcessCrash;
export {
  PatchProcessCrash_default as default
};
//# sourceMappingURL=PatchProcessCrash.js.map
