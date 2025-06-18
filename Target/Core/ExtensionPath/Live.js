import { Effect, Layer } from "effect";
import InitDataService from "../../Service/InitData/Service.js";
import Definition from "./Definition.js";
import Service from "./Service.js";
var Live_default = Layer.effect(
  Service,
  Effect.map(
    InitDataService,
    (InitData) => new Definition(InitData.extensions.allExtensions)
  )
);
export {
  Live_default as default
};
//# sourceMappingURL=Live.js.map
