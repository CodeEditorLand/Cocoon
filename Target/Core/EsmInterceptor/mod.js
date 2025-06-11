import { Layer } from "effect";
import { Live as LiveLog } from "../../Service/Log.js";
import { Live as LiveApiFactory } from "../ApiFactory/mod.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.merge(LiveApiFactory, LiveLog))
);
export {
  Live
};
//# sourceMappingURL=mod.js.map
