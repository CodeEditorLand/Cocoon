var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { ExtensionDescriptionRegistry } from "vs/workbench/services/extensions/common/extensionDescriptionRegistry.js";
import ExtensionHostService from "../../Core/ExtensionHost/Service.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import InitDataService from "../InitData/Service.js";
import CreateAPIObject from "./CreateAPIObject.js";
var Definition_default = Effect.gen(function* () {
  const ExtensionHost = yield* ExtensionHostService;
  const InitData = yield* InitDataService;
  const OnDidChangeEvent = CreateEventStream();
  const AllExtensionsCache = yield* Ref.make(void 0);
  const ExtensionRegistry = new ExtensionDescriptionRegistry(
    InitData.extensions
  );
  const ServiceImplementation = {
    onDidChange: OnDidChangeEvent.event,
    getExtension: /* @__PURE__ */ __name((extensionId) => {
      const description = Effect.runSync(
        ExtensionHost.GetExtensionDescription(extensionId)
      );
      return description ? CreateAPIObject(description, ExtensionHost) : void 0;
    }, "getExtension"),
    get all() {
      return Ref.get(AllExtensionsCache).pipe(
        Effect.flatMap((maybeCache) => {
          if (maybeCache) {
            return Effect.succeed(maybeCache);
          }
          const descriptions = ExtensionRegistry.getAllExtensionDescriptions();
          const newCache = descriptions.map(
            (desc) => CreateAPIObject(desc, ExtensionHost)
          );
          return Ref.set(AllExtensionsCache, newCache).pipe(
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
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
