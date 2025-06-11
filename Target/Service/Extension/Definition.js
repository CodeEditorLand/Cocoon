var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Stream } from "effect";
import { ExtensionHost } from "../../Core/ExtensionHost/mod.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { CreateApiObject } from "./CreateApiObject.js";
const Definition = Effect.gen(function* (_) {
  const ExtensionHostService = yield* _(ExtensionHost.Tag);
  const OnDidChangeEvent = CreateEventStream();
  let allExtensionsCache = void 0;
  const ServiceImplementation = {
    onDidChange: OnDidChangeEvent.Stream.pipe(Stream.toEvent),
    getExtension: /* @__PURE__ */ __name((extensionId) => {
      const description = Effect.runSync(
        ExtensionHostService.GetExtensionDescription(extensionId)
      );
      return description ? CreateApiObject(description, ExtensionHostService) : void 0;
    }, "getExtension"),
    get all() {
      if (!allExtensionsCache) {
        const descriptions = Effect.runSync(
          ExtensionHostService.GetAllExtensionDescriptions()
        );
        allExtensionsCache = descriptions.map(
          (desc) => CreateApiObject(desc, ExtensionHostService)
        );
      }
      return allExtensionsCache;
    }
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
