var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Layer } from "effect";
import ConfigurationLive from "../Configuration/Live.js";
import DocumentLive from "../Document/Live.js";
import FileSystemLive from "../FileSystem/Live.js";
import IPCLive from "../IPC/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";
function Live_default(Config) {
  return Layer.effect(Service, Definition).pipe(
    Layer.provide(
      Layer.mergeAll(
        IPCLive(Config),
        DocumentLive(Config),
        FileSystemLive(Config),
        ConfigurationLive(Config)
      )
    )
  );
}
__name(Live_default, "default");
export {
  Live_default as default
};
//# sourceMappingURL=Live.js.map
