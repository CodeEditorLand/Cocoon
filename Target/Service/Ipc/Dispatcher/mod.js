import { Layer } from "effect";
import { Live as LiveCancellation } from "../../Cancellation/mod.js";
import { Live as LiveProtocolAdapter } from "../ProtocolAdapter/mod.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.merge(LiveProtocolAdapter, LiveCancellation))
);
export {
  Live
};
//# sourceMappingURL=mod.js.map
