import { Effect, Layer } from "effect";
import Definition from "./Definition.js";
import Service from "./Service.js";
const Live = Layer.effect(
  Service,
  // The Definition effect uses IPC.SendRequest, which can fail.
  // We treat this as a fatal error for layer construction using orDie.
  // This ensures the Layer's error channel is `never`.
  Definition.pipe(Effect.orDie)
);
var Live_default = Live;
export {
  Live_default as default
};
//# sourceMappingURL=Live.js.map
