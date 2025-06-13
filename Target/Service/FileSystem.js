import { Layer } from "effect";
import { Definition } from "./FileSystem/Definition.js";
import { Tag } from "./FileSystem/Service.js";
import { Live as LiveFileSystemInformation } from "./FileSystemInformation.js";
import { Live as LiveIPC } from "./IPC.js";
import { Tag as Tag2 } from "./FileSystem/Service.js";
export * from "./FileSystem/Error.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.merge(LiveIPC, LiveFileSystemInformation))
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=FileSystem.js.map
