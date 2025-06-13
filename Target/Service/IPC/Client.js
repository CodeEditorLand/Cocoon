import { Layer } from "effect";
import { Acquire } from "./Client/Acquire.js";
import { Tag } from "./Client/Service.js";
const Live = Layer.scoped(Tag, Acquire);
export {
  Live
};
//# sourceMappingURL=Client.js.map
