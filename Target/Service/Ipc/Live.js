var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Layer } from "effect";
import { Live as LiveClient } from "./Client/mod.js";
import { ConfigTag } from "./Config.js";
import { Definition } from "./Definition.js";
import { Live as LiveDispatcher } from "./Dispatcher/mod.js";
import { Live as LiveProtocolAdapter } from "./ProtocolAdapter/mod.js";
import { Live as LiveServer } from "./Server/mod.js";
import { Tag } from "./Service.js";
const Live = /* @__PURE__ */ __name((Configuration) => {
  const ConfigLayer = Layer.succeed(ConfigTag, Configuration);
  const ComposedLayer = Layer.provide(
    Layer.effect(Tag, Definition),
    // The top-level service implementation.
    Layer.mergeAll(
      // It depends on all of these other services.
      LiveClient,
      LiveServer,
      LiveDispatcher,
      LiveProtocolAdapter
    )
  );
  return Layer.provide(ComposedLayer, ConfigLayer);
}, "Live");
export {
  Live
};
//# sourceMappingURL=Live.js.map
