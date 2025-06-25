var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Option, Ref } from "effect";
import { ImplicitActivationEvents } from "vs/platform/extensionManagement/common/implicitActivationEvents.js";
import {
  ExtensionDescriptionRegistry
} from "vs/workbench/services/extensions/common/extensionDescriptionRegistry.js";
import { ExtensionKind } from "vscode";
import { ExtensionHost, ExtensionHostService } from "./ExtensionHost.js";
import { InitDataService } from "./InitData.js";
import { CreateEventStream } from "./Utility/CreateEventStream.js";
const CreateAPIObject = /* @__PURE__ */ __name((Description, ExtensionHost2) => {
  const Activate = Effect.gen(function* () {
    yield* ExtensionHost2.ActivateById(Description.identifier, {
      startup: false,
      extensionId: Description.identifier,
      activationEvent: "api"
    });
    const Exports = yield* ExtensionHost2.GetExtensionExports(
      Description.identifier
    );
    return Exports;
  });
  const GetExtensionKind = /* @__PURE__ */ __name(() => {
    const Kinds = Array.isArray(Description.extensionKind) ? Description.extensionKind : Description.extensionKind ? [Description.extensionKind] : ["workspace"];
    if (Kinds.includes("workspace")) return ExtensionKind.Workspace;
    return ExtensionKind.UI;
  }, "GetExtensionKind");
  const ExtensionAPIObject = {
    id: Description.identifier.value,
    extensionUri: Description.extensionLocation,
    extensionPath: Description.extensionLocation.fsPath,
    get isActive() {
      return Effect.runSync(
        ExtensionHost2.IsActivated(Description.identifier)
      );
    },
    get packageJSON() {
      return Description;
    },
    extensionKind: GetExtensionKind(),
    get exports() {
      return Effect.runSync(
        Effect.catchAll(
          ExtensionHost2.GetExtensionExports(Description.identifier),
          () => Effect.succeed(void 0)
        )
      );
    },
    activate: /* @__PURE__ */ __name(() => Effect.runPromise(Activate), "activate")
  };
  return Object.freeze(ExtensionAPIObject);
}, "CreateAPIObject");
class ExtensionService extends Effect.Service()(
  "Service/Extension",
  {
    effect: Effect.gen(function* () {
      const ExtensionHost2 = yield* ExtensionHostService;
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
      const GetExtension = /* @__PURE__ */ __name((ExtensionId) => Effect.succeed(
        ExtensionRegistry.getExtensionDescription(ExtensionId)
      ).pipe(
        Effect.map(Option.fromNullable),
        Effect.map(
          Option.map(
            (Description) => CreateAPIObject(Description, ExtensionHost2)
          )
        )
      ), "GetExtension");
      const GetAll = /* @__PURE__ */ __name(() => Ref.get(AllExtensionsCache).pipe(
        Effect.flatMap(
          Option.match({
            onSome: /* @__PURE__ */ __name((Cache) => Effect.succeed(Cache), "onSome"),
            onNone: /* @__PURE__ */ __name(() => Effect.gen(function* () {
              const Descriptions = ExtensionRegistry.getAllExtensionDescriptions();
              const NewCache = Descriptions.map(
                (Description) => CreateAPIObject(
                  Description,
                  ExtensionHost2
                )
              );
              yield* Ref.set(
                AllExtensionsCache,
                Option.some(NewCache)
              );
              return NewCache;
            }), "onNone")
          })
        )
      ), "GetAll");
      const Activate = /* @__PURE__ */ __name((ExtensionId) => Effect.gen(function* () {
        const MaybeExtension = yield* GetExtension(ExtensionId);
        if (Option.isNone(MaybeExtension)) {
          return yield* Effect.fail(
            new Error(`Extension '${ExtensionId}' not found.`)
          );
        }
        const TheExtension = MaybeExtension.value;
        yield* Effect.promise(() => TheExtension.activate());
        return TheExtension;
      }), "Activate");
      return {
        onDidChange: OnDidChangeEvent,
        GetExtension,
        GetAll,
        Activate
      };
    })
  }
) {
  static {
    __name(this, "ExtensionService");
  }
}
export {
  ExtensionService
};
//# sourceMappingURL=Extension.js.map
