import { Layer } from "effect";
import { Live as LiveExtensionHost } from "../Core/ExtensionHost.js";
import { Definition } from "./Extension/Definition.js";
import { Tag } from "./Extension/Service.js";
import { Tag as Tag2 } from "./Extension/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(LiveExtensionHost)
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=Extension.js.map
