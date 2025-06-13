import { Layer } from "effect";
import { Live as LiveCommand } from "./Command.js";
import { Live as LiveIPC } from "./IPC.js";
import { Definition } from "./TreeView/Definition.js";
import { Tag } from "./TreeView/Service.js";
import { Tag as Tag2 } from "./TreeView/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.merge(LiveIPC, LiveCommand))
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=TreeView.js.map
