var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, PubSub } from "effect";
import { Emitter } from "vs/base/common/event.js";
const CreateEventStream = /* @__PURE__ */ __name(() => {
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
//# sourceMappingURL=CreateEventStream.js.map
