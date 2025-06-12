import { Layer } from "effect";
import { Live as LiveClient } from "../Client/mod.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(LiveClient)
);
export {
  Live
};
//# sourceMappingURL=mod.js.map
