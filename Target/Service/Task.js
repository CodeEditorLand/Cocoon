import { Layer } from "effect";
import { Live as LiveIPC } from "./IPC.js";
import { Definition } from "./Task/Definition.js";
import { Tag } from "./Task/Service.js";
import { Tag as Tag2 } from "./Task/Service.js";
export * from "./Task/Type.js";
const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=Task.js.map
