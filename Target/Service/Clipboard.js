import { Layer } from "effect";
import { Definition } from "./Clipboard/Definition.js";
import { Tag } from "./Clipboard/Service.js";
import { Live as LiveIPC } from "./IPC.js";
import { Tag as Tag2 } from "./Clipboard/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=Clipboard.js.map
