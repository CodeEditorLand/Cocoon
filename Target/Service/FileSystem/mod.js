import { Layer } from "effect";
import { Live as LiveFileSystemInfo } from "../FileSystemInfo/mod.js";
import { Live as LiveIpc } from "../Ipc/mod.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";
import { Tag as Tag2 } from "./Service.js";
export * from "./Error.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.merge(LiveIpc, LiveFileSystemInfo))
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=mod.js.map
