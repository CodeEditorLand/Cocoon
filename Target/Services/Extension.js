var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Interfaces/IMountainClientService.ts
import * as Effect from "effect/Effect";
var IMountainClientService = Effect.Service()(
  "Service/MountainClient",
  {
    effect: Effect.gen(function* () {
      return {};
    })
  }
);

// Source/Services/Extension.ts
import { Context, Effect as Effect2, Ref } from "effect";
var ExtensionService = class extends Effect2.Service()(
  "Service/Extension",
  {
    effect: Effect2.gen(function* () {
      yield* IMountainClientService;
      const Configuration = yield* Context.Tag(
        "Service/Configuration"
      );
      const Logger = yield* Context.Tag("Service/Logger");
      const ExtensionRegistryRef = yield* Ref.make(
        /* @__PURE__ */ new Map()
      );
      const ExtensionActivationRef = yield* Ref.make(
        /* @__PURE__ */ new Map()
      );
      const ExtensionExportsRef = yield* Ref.make(
        /* @__PURE__ */ new Map()
      );
      yield* Ref.make(/* @__PURE__ */ new Map());
      const OnDidChangeListeners = /* @__PURE__ */ new Set();
      const DiscoverExtensions = /* @__PURE__ */ __name(() => Effect2.gen(function* () {
        Logger.Debug(
          "[ExtensionService] Discovering extensions from configuration"
        );
        const ExtensionsConfig = Configuration.GetValue("extensions", {});
        const NewRegistry = /* @__PURE__ */ new Map();
        for (const [
          ExtensionId,
          ExtensionDataRaw
        ] of Object.entries(ExtensionsConfig)) {
          try {
            const ExtensionData = ExtensionDataRaw;
            const ExtensionLocation = typeof ExtensionData === "string" ? ExtensionData : ExtensionData.path;
            const Description = {
              identifier: ExtensionId,
              displayName: typeof ExtensionData === "object" && ExtensionData.displayName ? ExtensionData.displayName : ExtensionId,
              version: typeof ExtensionData === "object" && ExtensionData.version ? ExtensionData.version : "0.0.0",
              publisher: typeof ExtensionData === "object" && ExtensionData.publisher ? ExtensionData.publisher : void 0,
              description: typeof ExtensionData === "object" && ExtensionData.description ? ExtensionData.description : void 0,
              extensionLocation: VSCode.Uri.parse(ExtensionLocation),
              activationEvents: typeof ExtensionData === "object" && ExtensionData.activationEvents ? ExtensionData.activationEvents : void 0,
              main: typeof ExtensionData === "object" && ExtensionData.main ? ExtensionData.main : void 0,
              browser: typeof ExtensionData === "object" && ExtensionData.browser ? ExtensionData.browser : void 0,
              contributes: typeof ExtensionData === "object" && ExtensionData.contributes ? ExtensionData.contributes : void 0
            };
            NewRegistry.set(ExtensionId, Description);
            Logger.Debug(
              `[ExtensionService] Extension discovered: ${ExtensionId}`
            );
          } catch (error) {
            Logger.Error(
              `[ExtensionService] Failed to parse extension config for ${ExtensionId}`,
              error
            );
          }
        }
        const OldRegistry = yield* Ref.get(ExtensionRegistryRef);
        if (NewRegistry.size !== OldRegistry.size || Array.from(NewRegistry.keys()).some(
          (key) => !OldRegistry.has(key) || JSON.stringify(NewRegistry.get(key)) !== JSON.stringify(OldRegistry.get(key))
        )) {
          yield* Ref.set(ExtensionRegistryRef, NewRegistry);
          Logger.Info(
            `[ExtensionService] Extensions discovered: ${NewRegistry.size} extensions`
          );
          OnDidChangeListeners.forEach((Listener) => Listener());
        }
      }), "DiscoverExtensions");
      const GetExtension = /* @__PURE__ */ __name((ExtensionId) => Effect2.succeed(() => {
        const Registry = Effect2.runSync(
          Ref.get(ExtensionRegistryRef)
        );
        const Description = Registry.get(ExtensionId);
        if (!Description) {
          return void 0;
        }
        const ActivationMap = Effect2.runSync(
          Ref.get(ExtensionActivationRef)
        );
        const ExportsMap = Effect2.runSync(
          Ref.get(ExtensionExportsRef)
        );
        const ExtensionObject = {
          id: Description.identifier,
          extensionUri: Description.extensionLocation,
          extensionPath: Description.extensionLocation.fsPath,
          isActive: ActivationMap.get(ExtensionId) ?? false,
          packageJSON: Description,
          exports: ExportsMap.get(ExtensionId),
          extensionKind: Description.kind?.[0],
          activate: /* @__PURE__ */ __name(async () => {
            Logger.Warn(
              `[ExtensionService] activate() called on ${ExtensionId}, but activation is handled by ExtensionHostService`
            );
            return ExportsMap.get(ExtensionId);
          }, "activate")
        };
        return ExtensionObject;
      })(), "GetExtension");
      const GetAllExtensions = /* @__PURE__ */ __name(() => Effect2.succeed(() => {
        const Registry = Effect2.runSync(
          Ref.get(ExtensionRegistryRef)
        );
        const ActivationMap = Effect2.runSync(
          Ref.get(ExtensionActivationRef)
        );
        const ExportsMap = Effect2.runSync(
          Ref.get(ExtensionExportsRef)
        );
        const Extensions = Array.from(Registry.entries()).map(
          ([id, description]) => {
            return {
              id: description.identifier,
              extensionUri: description.extensionLocation,
              extensionPath: description.extensionLocation.fsPath,
              isActive: ActivationMap.get(id) ?? false,
              packageJSON: description,
              exports: ExportsMap.get(id)
            };
          }
        );
        return Extensions;
      })(), "GetAllExtensions");
      const GetExtensionPath = /* @__PURE__ */ __name((ExtensionId) => Effect2.succeed(() => {
        const Extension = Effect2.runSync(GetExtension(ExtensionId));
        return Extension?.extensionPath;
      }), "GetExtensionPath");
      const OnDidChange = /* @__PURE__ */ __name((Listener) => {
        OnDidChangeListeners.add(Listener);
        const Disposable = {
          dispose: /* @__PURE__ */ __name(() => {
            OnDidChangeListeners.delete(Listener);
          }, "dispose")
        };
        return Disposable;
      }, "OnDidChange");
      const MarkActivated = /* @__PURE__ */ __name((ExtensionId, Exports) => Effect2.gen(function* () {
        yield* Ref.update(ExtensionActivationRef, (Map2) => {
          const NewMap = new Map2(Map2);
          NewMap.set(ExtensionId, true);
          return NewMap;
        });
        yield* Ref.update(ExtensionExportsRef, (Map2) => {
          const NewMap = new Map2(Map2);
          NewMap.set(ExtensionId, Exports);
          return NewMap;
        });
        Logger.Info(
          `[ExtensionService] Extension activated: ${ExtensionId}`
        );
      }), "MarkActivated");
      const MarkDeactivated = /* @__PURE__ */ __name((ExtensionId) => Effect2.gen(function* () {
        yield* Ref.update(ExtensionActivationRef, (Map2) => {
          const NewMap = new Map2(Map2);
          NewMap.set(ExtensionId, false);
          return NewMap;
        });
        Logger.Debug(
          `[ExtensionService] Extension deactivated: ${ExtensionId}`
        );
      }), "MarkDeactivated");
      yield* DiscoverExtensions();
      const ServiceImplementation = {
        GetExtension,
        GetAllExtensions,
        GetExtensionPath,
        OnDidChange,
        MarkActivated,
        MarkDeactivated
      };
      return ServiceImplementation;
    })
  }
) {
  static {
    __name(this, "ExtensionService");
  }
};
export {
  ExtensionService
};
//# sourceMappingURL=Extension.js.map
