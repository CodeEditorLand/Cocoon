import { Layer } from "effect";
import { Definition } from "./Dialog/Definition.js";
import { Tag } from "./Dialog/Service.js";
import { Live as LiveIPC } from "./IPC.js";
import { Tag as Tag2 } from "./Dialog/Service.js";
export * from "./Dialog/Type.js";
export * from "./Dialog/Error.js";
const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=Dialog.js.map
