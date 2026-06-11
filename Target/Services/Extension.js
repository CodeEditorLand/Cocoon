var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Interfaces/I/Mountain/Client/Service.ts
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
import { Context, Effect as Effect2 } from "effect";
var ExtensionService = class extends Effect2.Service()(
  "Service/Extension",
  {
    effect: Effect2.gen(function* () {
      yield* IMountainClientService;
      const Configuration = yield* Context.Tag(
        "Service/Configuration"
      );
      const Logger = yield* Context.Tag("Service/Logger");
      const _registry = /* @__PURE__ */ new Map();
      const _activation = /* @__PURE__ */ new Map();
      const _exports = /* @__PURE__ */ new Map();
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
              // LAND-FIX: empty-string URI guard. ruby-lsp's
              // registry insert on Land/.fiddee/extensions/...
              // occasionally lands with `path: ""`; the
              // resulting `URI.parse("")` throws
              // "[UriError]: Scheme contains illegal
              // characters. (len:0)" and kills the
              // activation. Synthesise a `file://` URI from
              // the extension id when the location is
              // blank - same pattern as the Empty-URI-Guard
              // skill at HydrateUriResults / StockLift.
              extensionLocation: ExtensionLocation && ExtensionLocation.length > 0 ? VSCode.Uri.parse(ExtensionLocation) : VSCode.Uri.parse(
                `file:///nonexistent/${ExtensionId}`
              ),
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
        if (NewRegistry.size !== _registry.size || Array.from(NewRegistry.keys()).some(
          (key) => !_registry.has(key) || JSON.stringify(NewRegistry.get(key)) !== JSON.stringify(_registry.get(key))
        )) {
          _registry.clear();
          NewRegistry.forEach((v, k) => _registry.set(k, v));
          Logger.Info(
            `[ExtensionService] Extensions discovered: ${NewRegistry.size} extensions`
          );
          OnDidChangeListeners.forEach((Listener) => Listener());
        }
      }), "DiscoverExtensions");
      const GetExtension = /* @__PURE__ */ __name((ExtensionId) => Effect2.succeed(() => {
        const Description = _registry.get(ExtensionId);
        if (!Description) {
          return void 0;
        }
        const SafePackageJSON = (() => {
          const Raw = Description;
          const Identifier = Description.identifier;
          const PublisherFallback = typeof Identifier === "string" ? Identifier.split(".")[0] ?? "unknown" : "unknown";
          return {
            ...Description,
            name: typeof Raw.name === "string" && Raw.name.length > 0 ? Raw.name : Identifier,
            version: typeof Raw.version === "string" && Raw.version.length > 0 ? Raw.version : "0.0.0",
            publisher: typeof Raw.publisher === "string" ? Raw.publisher : PublisherFallback
          };
        })();
        const ExtensionObject = {
          id: Description.identifier,
          extensionUri: Description.extensionLocation,
          extensionPath: Description.extensionLocation.fsPath,
          isActive: _activation.get(ExtensionId) ?? false,
          packageJSON: SafePackageJSON,
          exports: _exports.get(ExtensionId),
          extensionKind: Description.kind?.[0],
          activate: /* @__PURE__ */ __name(async () => {
            Logger.Warn(
              `[ExtensionService] activate() called on ${ExtensionId}, but activation is handled by ExtensionHostService`
            );
            return _exports.get(ExtensionId);
          }, "activate")
        };
        return ExtensionObject;
      })(), "GetExtension");
      const GetAllExtensions = /* @__PURE__ */ __name(() => Effect2.succeed(() => {
        const Extensions = Array.from(_registry.entries()).map(
          ([id, description]) => {
            const Raw = description;
            const PublisherFallback = typeof id === "string" ? id.split(".")[0] ?? "unknown" : "unknown";
            const SafePackageJSON = {
              ...description,
              name: typeof Raw.name === "string" && Raw.name.length > 0 ? Raw.name : id,
              version: typeof Raw.version === "string" && Raw.version.length > 0 ? Raw.version : "0.0.0",
              publisher: typeof Raw.publisher === "string" ? Raw.publisher : PublisherFallback
            };
            return {
              id: description.identifier,
              extensionUri: description.extensionLocation,
              extensionPath: description.extensionLocation.fsPath,
              isActive: _activation.get(id) ?? false,
              packageJSON: SafePackageJSON,
              exports: _exports.get(id)
            };
          }
        );
        return Extensions;
      })(), "GetAllExtensions");
      const GetExtensionPath = /* @__PURE__ */ __name((ExtensionId) => Effect2.succeed(
        _registry.get(ExtensionId)?.extensionLocation?.fsPath
      ), "GetExtensionPath");
      const OnDidChange = /* @__PURE__ */ __name((Listener) => {
        OnDidChangeListeners.add(Listener);
        const Disposable = {
          dispose: /* @__PURE__ */ __name(() => {
            OnDidChangeListeners.delete(Listener);
          }, "dispose")
        };
        return Disposable;
      }, "OnDidChange");
      const MarkActivated = /* @__PURE__ */ __name((ExtensionId, Exports) => Effect2.sync(() => {
        _activation.set(ExtensionId, true);
        _exports.set(ExtensionId, Exports);
        Logger.Info(
          `[ExtensionService] Extension activated: ${ExtensionId}`
        );
      }), "MarkActivated");
      const MarkDeactivated = /* @__PURE__ */ __name((ExtensionId) => Effect2.sync(() => {
        _activation.set(ExtensionId, false);
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
