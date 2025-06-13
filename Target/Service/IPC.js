var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Layer } from "effect";
import { Live as LiveClient } from "./IPC/Client.js";
import { Tag as ConfigTag } from "./IPC/Configuration.js";
import { Definition } from "./IPC/Definition.js";
import { Live as LiveDispatcher } from "./IPC/Dispatcher.js";
import { Live as LiveProtocolAdapter } from "./IPC/ProtocolAdapter.js";
import { Live as LiveServer } from "./IPC/Server.js";
import { Tag } from "./IPC/Service.js";
import { Tag as Tag2 } from "./IPC/Service.js";
import {
  Tag as Tag3
} from "./IPC/Configuration.js";
export * from "./IPC/Error.js";
function Live(Config) {
  const ConfigLayer = Layer.succeed(ConfigTag, Config);
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
}
__name(Live, "Live");
export {
  Tag3 as ConfigurationTag,
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=IPC.js.map
