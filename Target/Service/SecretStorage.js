import { Layer } from "effect";
import { Live as LiveIPC } from "./IPC.js";
import { Live as LiveLog } from "./Log.js";
import { Definition } from "./SecretStorage/Definition.js";
import { Tag } from "./SecretStorage/Service.js";
import { Tag as Tag2 } from "./SecretStorage/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.merge(LiveIPC, LiveLog))
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=SecretStorage.js.map
