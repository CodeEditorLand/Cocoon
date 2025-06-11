import { Layer } from "effect";
import { Acquire } from "./Acquire.js";
import { Tag } from "./Service.js";
const Live = Layer.scoped(
  Tag,
  Acquire
);
export {
  Live
};
//# sourceMappingURL=mod.js.map
