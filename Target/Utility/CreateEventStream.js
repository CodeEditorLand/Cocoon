var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, PubSub } from "effect";
import { Emitter } from "vs/base/common/event.js";
const CreateEventStream = /* @__PURE__ */ __name(() => {
  const VscodeEmitter = new Emitter();
  const PubSubInstance = Effect.runSync(PubSub.unbounded());
  const Fire = /* @__PURE__ */ __name((Data) => PubSub.publish(PubSubInstance, Data).pipe(
    Effect.andThen(Effect.sync(() => VscodeEmitter.fire(Data))),
    Effect.asVoid
  ), "Fire");
  const event = VscodeEmitter.event;
  const Shutdown = /* @__PURE__ */ __name(() => PubSub.shutdown(PubSubInstance), "Shutdown");
  return {
    Fire,
    PubSub: PubSubInstance,
    event,
    Shutdown
  };
}, "CreateEventStream");
var CreateEventStream_default = CreateEventStream;
export {
  CreateEventStream_default as default
};
//# sourceMappingURL=CreateEventStream.js.map
