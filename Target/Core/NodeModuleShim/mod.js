import { Layer } from "effect";
import { Live as LiveLog } from "../../Service/Log.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";
import { Tag as Tag2 } from "./Service.js";
export * from "./Error.js";
const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveLog));
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=mod.js.map
