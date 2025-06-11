import { Layer } from "effect";
import { Live as LiveConfiguration } from "../Configuration/mod.js";
import { Live as LiveDocuments } from "../Documents/mod.js";
import { Live as LiveFileSystem } from "../FileSystem/mod.js";
import { Live as LiveIpc } from "../Ipc/mod.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";
import { Tag as Tag2 } from "./Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(
    Layer.mergeAll(
      LiveIpc,
      LiveDocuments,
      LiveFileSystem,
      LiveConfiguration
    )
  )
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=mod.js.map
