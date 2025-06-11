import { Layer } from "effect";
import { Live as LiveFileSystem } from "../FileSystem/mod.js";
import { InitDataService } from "../InitData.js";
import { Live as LiveLog } from "../Log.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";
import { Tag as Tag2 } from "./Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.merge(LiveFileSystem, LiveLog))
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=mod.js.map
