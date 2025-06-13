var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref, Stream } from "effect";
import { ExtensionDescriptionRegistry } from "vs/workbench/services/extensions/common/extensionDescriptionRegistry.js";
import { ExtensionHost } from "../../Core/ExtensionHost.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { InitData } from "../InitData.js";
import { CreateAPIObject } from "./CreateAPIObject.js";
const Definition = Effect.gen(function* (_) {
  const ExtensionHostService = yield* _(ExtensionHost.Tag);
  const InitDataService = yield* _(InitData.Tag);
  const OnDidChangeEvent = CreateEventStream();
  const allExtensionsCache = yield* _(
    Ref.make(void 0)
  );
  const ExtensionRegistry = new ExtensionDescriptionRegistry(
    InitDataService.extensions
  );
  const ServiceImplementation = {
    onDidChange: OnDidChangeEvent.Stream.pipe(Stream.toEvent),
    getExtension: /* @__PURE__ */ __name((extensionId) => {
      const description = Effect.runSync(
        ExtensionHostService.GetExtensionDescription(extensionId)
      );
      return description ? CreateAPIObject(description, ExtensionHostService) : void 0;
    }, "getExtension"),
    get all() {
      return Ref.get(allExtensionsCache).pipe(
        Effect.flatMap((maybeCache) => {
          if (maybeCache) {
            return Effect.succeed(maybeCache);
          }
          const descriptions = ExtensionRegistry.getAllExtensionDescriptions();
          const newCache = descriptions.map(
            (desc) => CreateAPIObject(desc, ExtensionHostService)
          );
          return Ref.set(allExtensionsCache, newCache).pipe(
            Effect.as(newCache)
          );
        }),
        Effect.runSync
      );
    }
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
