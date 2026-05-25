var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Utility/Event/Stream.ts
import {
  Emitter
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/event.js";
import { Effect, PubSub } from "effect";
var CreateEventStream = /* @__PURE__ */ __name(() => {
  const VSCodeEmitter = new Emitter();
  const PubSubInstance = Effect.runSync(PubSub.unbounded());
  const Fire = /* @__PURE__ */ __name((Data) => PubSub.publish(PubSubInstance, Data).pipe(
    Effect.andThen(Effect.sync(() => VSCodeEmitter.fire(Data))),
    Effect.asVoid
  ), "Fire");
  const Shutdown = /* @__PURE__ */ __name(() => Effect.all([
    PubSub.shutdown(PubSubInstance),
    Effect.sync(() => VSCodeEmitter.dispose())
  ]).pipe(Effect.asVoid), "Shutdown");
  return {
    Fire,
    PubSub: PubSubInstance,
    event: VSCodeEmitter.event,
    Shutdown
  };
}, "CreateEventStream");
export {
  CreateEventStream
};
//# sourceMappingURL=Stream.js.map
