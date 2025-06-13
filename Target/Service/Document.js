import { Layer } from "effect";
import { Definition } from "./Document/Definition.js";
import { Tag } from "./Document/Service.js";
import { Live as LiveIPC } from "./IPC.js";
import { Tag as Tag2 } from "./Document/Service.js";
export * from "./Document/Type.js";
const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=Document.js.map
