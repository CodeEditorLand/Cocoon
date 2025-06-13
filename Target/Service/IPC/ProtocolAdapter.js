import { Layer } from "effect";
import { Live as LiveClient } from "./Client.js";
import { Definition } from "./ProtocolAdapter/Definition.js";
import { Tag } from "./ProtocolAdapter/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(LiveClient)
);
export {
  Live
};
//# sourceMappingURL=ProtocolAdapter.js.map
