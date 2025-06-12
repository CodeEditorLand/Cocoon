import { Context, Effect, Layer } from "effect";
import { InitDataService } from "../../Service/InitData.js";
import { Definition } from "./Definition.js";
const Tag = Context.Tag("Core/ExtensionPaths");
const Live = Layer.effect(
  Tag,
  Effect.map(
    InitDataService,
    (InitData) => new Definition(InitData.extensions)
  )
);
export {
  Live,
  Tag
};
//# sourceMappingURL=mod.js.map
