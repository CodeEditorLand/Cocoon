import { Layer } from "effect";
import { Live as LiveClipboard } from "../Clipboard/mod.js";
import { Live as LiveIpc } from "../Ipc/mod.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";
import { Tag as Tag2 } from "./Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.merge(LiveIpc, LiveClipboard))
  // The InitDataService must be provided by the top-level application layer.
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=mod.js.map
