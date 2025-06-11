import { Layer } from "effect";
import { Live as LiveDispatcher } from "../Dispatcher/mod.js";
import { Acquire } from "./Acquire.js";
import { Tag } from "./Service.js";
const Live = Layer.scoped(Tag, Acquire).pipe(Layer.provide(LiveDispatcher));
export {
  Live
};
//# sourceMappingURL=mod.js.map
