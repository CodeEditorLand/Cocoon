import { Layer } from "effect";
import { Live as LiveConfiguration } from "./Configuration.js";
import { Live as LiveDocument } from "./Document.js";
import { Live as LiveFileSystem } from "./FileSystem.js";
import { Live as LiveIPC } from "./IPC.js";
import { Definition } from "./WorkSpace/Definition.js";
import { Tag } from "./WorkSpace/Service.js";
import { Tag as Tag2 } from "./WorkSpace/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(
    Layer.mergeAll(
      LiveIPC,
      LiveDocument,
      LiveFileSystem,
      LiveConfiguration
    )
  )
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=WorkSpace.js.map
