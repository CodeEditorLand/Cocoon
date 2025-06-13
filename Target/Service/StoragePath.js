import { Layer } from "effect";
import { Live as LiveFileSystem } from "./FileSystem.js";
import { Live as LiveLog } from "./Log.js";
import { Definition } from "./StoragePath/Definition.js";
import { Tag } from "./StoragePath/Service.js";
import { Tag as Tag2 } from "./StoragePath/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  // The FileSystem dependency is for the EnsureDirectory helper.
  Layer.provide(Layer.merge(LiveFileSystem, LiveLog))
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=StoragePath.js.map
