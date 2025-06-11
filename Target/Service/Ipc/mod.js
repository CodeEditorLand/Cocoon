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
import { Tag as Tag2 } from "./Service.js";
import { ConfigTag as ConfigTag2 } from "./Config.js";
export * from "./Error.js";
const Live = /* @__PURE__ */ __name((Configuration) => {
  const ConfigLayer = Layer.succeed(ConfigTag, Configuration);
  const ComposedLayer = Layer.provide(
    Layer.effect(Tag, Definition),
    Layer.mergeAll(
      LiveClient,
      LiveServer,
      LiveDispatcher,
      LiveProtocolAdapter
    )
  );
  return Layer.provide(ComposedLayer, ConfigLayer);
}, "Live");
export {
  ConfigTag2 as ConfigTag,
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=mod.js.map
