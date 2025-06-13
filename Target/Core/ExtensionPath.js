import { Context, Effect, Layer } from "effect";
import { InitData } from "../../Service/InitData.js";
import { Definition } from "./ExtensionPath/Definition.js";
const Tag = Context.Tag("Core/ExtensionPath");
const Live = Layer.effect(
  Tag,
  Effect.map(InitData.Tag, (InitData2) => new Definition(InitData2.extensions))
);
export {
  Live,
  Tag
};
//# sourceMappingURL=ExtensionPath.js.map
