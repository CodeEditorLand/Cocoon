import { Layer } from "effect";
import { Definition } from "./APIDeprecation/Definition.js";
import { Tag } from "./APIDeprecation/Service.js";
import { Live as LiveLog } from "./Log.js";
const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveLog));
export {
  Live,
  Tag
};
//# sourceMappingURL=APIDeprecation.js.map
