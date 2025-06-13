import { Layer } from "effect";
import { Live as LiveLog } from "../../Service/Log.js";
import { Definition } from "./NodeModuleShim/Definition.js";
import { Tag } from "./NodeModuleShim/Service.js";
import { Tag as Tag2 } from "./NodeModuleShim/Service.js";
export * from "./NodeModuleShim/Error.js";
const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveLog));
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=NodeModuleShim.js.map
