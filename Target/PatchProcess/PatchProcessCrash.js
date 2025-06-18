import { Effect } from "effect";
import ProcessPatchService from "./Service.js";
const PatchProcessCrashEffect = Effect.gen(function* (G) {
  const ProcessPatch = yield* G(ProcessPatchService);
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
    yield* G(Effect.logTrace("Successfully patched 'process.crash'."));
  } else {
    yield* G(
      Effect.logTrace(
        "'process.crash()' not found in this environment, skipping patch."
      )
    );
  }
});
var PatchProcessCrash_default = PatchProcessCrashEffect;
export {
  PatchProcessCrash_default as default
};
//# sourceMappingURL=PatchProcessCrash.js.map
