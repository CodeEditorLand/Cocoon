import { Layer } from "effect";
import { Live as LiveIPC } from "./IPC.js";
import { Definition } from "./Localization/Definition.js";
import { Tag } from "./Localization/Service.js";
import { Tag as Tag2 } from "./Localization/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=Localization.js.map
