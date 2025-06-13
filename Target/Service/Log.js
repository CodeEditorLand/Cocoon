import { Layer } from "effect";
import { Definition } from "./Log/Definition.js";
import { Tag } from "./Log/Service.js";
import { Tag as Tag2 } from "./Log/Service.js";
const Live = Layer.effect(Tag, Definition);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=Log.js.map
