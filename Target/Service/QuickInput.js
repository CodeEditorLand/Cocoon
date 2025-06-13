import { Layer } from "effect";
import { Live as LiveIPC } from "./IPC.js";
import { Definition } from "./QuickInput/Definition.js";
import { Tag } from "./QuickInput/Service.js";
import { Tag as Tag2 } from "./QuickInput/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=QuickInput.js.map
