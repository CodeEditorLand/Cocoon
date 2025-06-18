import { Effect } from "effect";
const SetStackTraceLimit = Effect.sync(() => {
  Error.stackTraceLimit = 100;
}).pipe(
  Effect.tap(
    () => Effect.logTrace("Increased `Error.stackTraceLimit` to 100.")
  )
);
var SetStackTraceLimit_default = SetStackTraceLimit;
export {
  SetStackTraceLimit_default as default
};
//# sourceMappingURL=SetStackTraceLimit.js.map
