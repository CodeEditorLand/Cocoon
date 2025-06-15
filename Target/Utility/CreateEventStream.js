var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Hub, Stream } from "effect";
import { Emitter } from "vs/base/common/event.js";
const CreateEventStream = /* @__PURE__ */ __name(() => {
  const VscodeEmitter = new Emitter();
  const HubInstance = Effect.runSync(Hub.unbounded());
  const Fire = /* @__PURE__ */ __name((Data) => Hub.publish(HubInstance, Data).pipe(Effect.asVoid), "Fire");
  const FireWithVscode = /* @__PURE__ */ __name((Data) => Effect.sync(() => VscodeEmitter.fire(Data)).pipe(
    Effect.andThen(() => Fire(Data))
  ), "FireWithVscode");
  const event = VscodeEmitter.event;
  const StreamFromHub = Stream.fromHub(HubInstance);
  const Shutdown = /* @__PURE__ */ __name(() => Hub.shutdown(HubInstance), "Shutdown");
  return {
    Fire: FireWithVscode,
    Stream: StreamFromHub,
    event,
    Shutdown
  };
}, "CreateEventStream");
var CreateEventStream_default = CreateEventStream;
export {
  CreateEventStream_default as default
};
//# sourceMappingURL=CreateEventStream.js.map
