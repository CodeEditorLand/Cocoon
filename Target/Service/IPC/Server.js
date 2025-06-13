import { Layer } from "effect";
import { Live as LiveDispatcher } from "./Dispatcher.js";
import { Acquire } from "./Server/Acquire.js";
import { Tag } from "./Server/Service.js";
const Live = Layer.scoped(Tag, Acquire).pipe(Layer.provide(LiveDispatcher));
export {
  Live
};
//# sourceMappingURL=Server.js.map
