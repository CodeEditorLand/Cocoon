import { Layer } from "effect";
import { Live as ClientLive } from "../Client.js";
import Definition from "./Definition.js";
import Service from "./Service.js";
const Live = Layer.effect(Service, Definition).pipe(Layer.provide(ClientLive));
var Live_default = Live;
export {
  Live_default as default
};
//# sourceMappingURL=Live.js.map
