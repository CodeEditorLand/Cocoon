import { Layer } from "effect";
import { Live as LiveIPC } from "./IPC.js";
import { Definition } from "./StatusBar/Definition.js";
import { Tag } from "./StatusBar/Service.js";
import { Tag as Tag2 } from "./StatusBar/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=StatusBar.js.map
