import { Layer } from "effect";
import { Live as LiveLog } from "../../Service/Log.js";
import { Live as LiveAPIFactory } from "../APIFactory.js";
import { Live as LiveExtensionPath } from "../ExtensionPath.js";
import { Definition } from "./RequireInterceptor/Definition.js";
import { Tag } from "./RequireInterceptor/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.mergeAll(LiveAPIFactory, LiveExtensionPath, LiveLog))
);
export {
  Live
};
//# sourceMappingURL=RequireInterceptor.js.map
