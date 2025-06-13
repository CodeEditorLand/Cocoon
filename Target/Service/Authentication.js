import { Layer } from "effect";
import { Definition } from "./Authentication/Definition.js";
import { Tag } from "./Authentication/Service.js";
import { Live as LiveIPC } from "./IPC.js";
import { Tag as Tag2 } from "./Authentication/Service.js";
export * from "./Authentication/Type.js";
export * from "./Authentication/Error.js";
const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=Authentication.js.map
