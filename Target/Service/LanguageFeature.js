import { Layer } from "effect";
import { Live as LiveCancellation } from "./Cancellation.js";
import { Live as LiveCommand } from "./Command.js";
import { Live as LiveDocument } from "./Document.js";
import { Live as LiveIPC } from "./IPC.js";
import { Definition } from "./LanguageFeature/Definition.js";
import { Tag } from "./LanguageFeature/Service.js";
import { Tag as Tag2 } from "./LanguageFeature/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(
    Layer.mergeAll(LiveIPC, LiveDocument, LiveCancellation, LiveCommand)
  )
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=LanguageFeature.js.map
