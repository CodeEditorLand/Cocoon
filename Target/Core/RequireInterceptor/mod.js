import { Layer } from "effect";
import { Live as LiveLog } from "../../Service/Log.js";
import { Live as LiveApiFactory } from "../ApiFactory/mod.js";
import { Live as LiveExtensionPaths } from "../ExtensionPaths/mod.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.mergeAll(LiveApiFactory, LiveExtensionPaths, LiveLog))
);
export {
  Live
};
//# sourceMappingURL=mod.js.map
