var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Option, Ref } from "effect";
import { ImplicitActivationEvents } from "vs/platform/extensionManagement/common/implicitActivationEvents.js";
import {
  ExtensionDescriptionRegistry
} from "vs/workbench/services/extensions/common/extensionDescriptionRegistry.js";
import ExtensionHostService from "../../Core/ExtensionHost/Service.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import InitDataService from "../InitData/Service.js";
import CreateAPIObject from "./CreateAPIObject.js";
var Definition_default = Effect.gen(function* () {
  const ExtensionHost = yield* ExtensionHostService;
  const InitData = yield* InitDataService;
  const { event: OnDidChangeEvent } = CreateEventStream();
  const AllExtensionsCache = yield* Ref.make(Option.none());
  const ActivationEventsReader = {
    readActivationEvents: /* @__PURE__ */ __name((description) => ImplicitActivationEvents.readActivationEvents(description), "readActivationEvents")
  };
  const ExtensionRegistry = new ExtensionDescriptionRegistry(
    ActivationEventsReader,
    InitData.extensions.allExtensions
  );
  const ServiceImplementation = {
    onDidChange: OnDidChangeEvent,
    GetExtension: /* @__PURE__ */ __name((extensionId) => Effect.succeed(
      ExtensionRegistry.getExtensionDescription(extensionId)
    ).pipe(
      Effect.map(Option.fromNullable),
      Effect.map(
        Option.map(
          (description) => CreateAPIObject(description, ExtensionHost)
        )
      )
    ), "GetExtension"),
    GetAll: /* @__PURE__ */ __name(() => Ref.get(AllExtensionsCache).pipe(
      Effect.flatMap(
        Option.match({
          onSome: /* @__PURE__ */ __name((cache) => Effect.succeed(cache), "onSome"),
          onNone: /* @__PURE__ */ __name(() => Effect.gen(function* () {
            const descriptions = ExtensionRegistry.getAllExtensionDescriptions();
            const newCache = descriptions.map(
              (desc) => CreateAPIObject(desc, ExtensionHost)
            );
            yield* Ref.set(
              AllExtensionsCache,
              Option.some(newCache)
            );
            return newCache;
          }), "onNone")
        })
      )
    ), "GetAll"),
    Activate: /* @__PURE__ */ __name((extensionId) => Effect.gen(function* () {
      const maybeExtension = yield* ServiceImplementation.GetExtension(extensionId);
      if (Option.isNone(maybeExtension)) {
        return yield* Effect.fail(
          new Error(`Extension '${extensionId}' not found.`)
        );
      }
      const extension = maybeExtension.value;
      yield* Effect.promise(() => extension.activate());
      return extension;
    }), "Activate")
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
