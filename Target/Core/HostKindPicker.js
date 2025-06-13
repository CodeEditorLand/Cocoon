import { Layer } from "effect";
import { Live as LiveLog } from "../../Service/Log.js";
import { Definition } from "./HostKindPicker/Definition.js";
import { Tag } from "./HostKindPicker/Service.js";
import { Tag as Tag2 } from "./HostKindPicker/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveLog));
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=HostKindPicker.js.map
