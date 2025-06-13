import { Layer } from "effect";
import { Live as LiveIPC } from "./IPC.js";
import { Live as LiveLog } from "./Log.js";
import { Definition } from "./Storage/Definition.js";
import { Tag } from "./Storage/Service.js";
import { Tag as Tag2 } from "./Storage/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.merge(LiveIPC, LiveLog))
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=Storage.js.map
