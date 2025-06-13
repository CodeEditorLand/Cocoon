import { Layer } from "effect";
import { Definition } from "./Cancellation/Definition.js";
import { Tag } from "./Cancellation/Service.js";
import { Tag as Tag2 } from "./Cancellation/Service.js";
const Live = Layer.effect(Tag, Definition);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=Cancellation.js.map
