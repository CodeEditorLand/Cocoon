import { Layer } from "effect";
import { Definition } from "./FileSystemInformation/Definition.js";
import { Tag } from "./FileSystemInformation/Service.js";
import { Live as LiveIPC } from "./IPC.js";
import { Live as LiveLog } from "./Log.js";
import { Tag as Tag2 } from "./FileSystemInformation/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.merge(LiveIPC, LiveLog))
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=FileSystemInformation.js.map
