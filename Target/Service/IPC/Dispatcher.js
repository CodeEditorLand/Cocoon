import { Layer } from "effect";
import { Live as LiveCancellation } from "../Cancellation.js";
import { Definition } from "./Dispatcher/Definition.js";
import { Tag } from "./Dispatcher/Service.js";
import { Live as LiveProtocolAdapter } from "./ProtocolAdapter.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.merge(LiveProtocolAdapter, LiveCancellation))
);
export {
  Live
};
//# sourceMappingURL=Dispatcher.js.map
