import { Layer } from "effect";
import { Definition } from "./Debug/Definition.js";
import { Tag } from "./Debug/Service.js";
import { Live as LiveIPC } from "./IPC.js";
import { Live as LiveLog } from "./Log.js";
import { Tag as Tag2 } from "./Debug/Service.js";
export * from "./Debug/Type.js";
export * from "./Debug/Error.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.merge(LiveIPC, LiveLog))
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=Debug.js.map
