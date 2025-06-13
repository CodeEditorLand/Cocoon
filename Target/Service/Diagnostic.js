import { Layer } from "effect";
import { Definition } from "./Diagnostic/Definition.js";
import { Tag } from "./Diagnostic/Service.js";
import { Live as LiveIPC } from "./IPC.js";
import { Tag as Tag2 } from "./Diagnostic/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=Diagnostic.js.map
