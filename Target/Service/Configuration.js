import { Layer } from "effect";
import { Definition } from "./Configuration/Definition.js";
import { Tag } from "./Configuration/Service.js";
import { Live as LiveIPC } from "./IPC.js";
import { Live as LiveLog } from "./Log.js";
import { Tag as Tag2 } from "./Configuration/Service.js";
export * from "./Configuration/Type.js";
export * from "./Configuration/Error.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.merge(LiveIPC, LiveLog))
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=Configuration.js.map
