import { Layer } from "effect";
import { Live as LiveExtensionHost } from "../../Core/ExtensionHost/mod.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";
import { Tag as Tag2 } from "./Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(LiveExtensionHost)
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=mod.js.map
