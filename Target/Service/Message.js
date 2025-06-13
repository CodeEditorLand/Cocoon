import { Layer } from "effect";
import { Live as LiveIPC } from "./IPC.js";
import { Definition } from "./Message/Definition.js";
import { Tag } from "./Message/Service.js";
import { Tag as Tag2 } from "./Message/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=Message.js.map
