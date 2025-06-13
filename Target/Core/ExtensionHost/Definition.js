var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { ExtensionDescriptionRegistry } from "vs/workbenchservices/extensions/common/extensionDescriptionRegistry.js";
import { InitData } from "../../Service/InitData.js";
import { IPC } from "../../Service/IPC.js";
import { Log } from "../../Service/Log.js";
import { APIFactory } from "../APIFactory.js";
const Definition = Effect.gen(function* (_) {
  const LogService = yield* _(Log.Tag);
  const IPCService = yield* _(IPC.Tag);
  const APIFactoryService = yield* _(APIFactory.Tag);
  const InitDataService = yield* _(InitData.Tag);
  const ExtensionRegistry = new ExtensionDescriptionRegistry(
    InitDataService.extensions
  );
  const ActivatedExtensions = yield* _(
    Ref.make(/* @__PURE__ */ new Map())
  );
  const IsActivated = /* @__PURE__ */ __name((ID) => Ref.get(ActivatedExtensions).pipe(
    Effect.map((map) => map.has(ID.value)),
    Effect.runSync
    // Safe because it's a synchronous Ref read
  ), "IsActivated");
  const GetExtensionExports = /* @__PURE__ */ __name((ID) => Ref.get(ActivatedExtensions).pipe(
    Effect.map((map) => map.get(ID.value)?.Exports),
    Effect.runSync
  ), "GetExtensionExports");
  const GetExtensionDescription = /* @__PURE__ */ __name((ID) => Effect.succeed(ExtensionRegistry.getExtensionDescription(ID)), "GetExtensionDescription");
  const Deactivate = /* @__PURE__ */ __name((Extension) => Effect.gen(function* (_2) {
    yield* _2(
      LogService.Info(
        `Deactivating extension '${Extension.ID.value}'...`
      )
    );
    for (const Subscription of Extension.Subscriptions) {
      yield* _2(
        Effect.try(() => Subscription.dispose()).pipe(
          Effect.catchAll(
            (e) => LogService.Warn(
              `Error during subscription disposal for ${Extension.ID.value}`,
              e
            )
          )
        )
      );
    }
    const DeactivateFunction = Extension.Module.deactivate;
    if (typeof DeactivateFunction === "function") {
      yield* _2(
        Effect.tryPromise({
          try: /* @__PURE__ */ __name(() => DeactivateFunction(), "try"),
          catch: /* @__PURE__ */ __name((e) => new Error(
            `Deactivation function for '${Extension.ID.value}' failed: ${e}`
          ), "catch")
        }).pipe(
          Effect.catchAll((e) => LogService.Error(e.message))
        )
      );
    }
  }), "Deactivate");
  const DoActivateExtension = /* @__PURE__ */ __name((Description, Reason) => Effect.gen(function* (_2) {
    yield* _2(
      LogService.Info(
        `Activating extension '${Description.identifier.value}' (Reason: ${Reason.activationEvent}).`
      )
    );
    const Module = yield* _2(
      Effect.tryPromise({
        try: /* @__PURE__ */ __name(() => import(Description.main), "try"),
        // main can be undefined, a real impl must guard
        catch: /* @__PURE__ */ __name((e) => new Error(
          `Failed to load module for '${Description.identifier.value}': ${e}`
        ), "catch")
      })
    );
    const ExtensionAPI = APIFactoryService.CreateAPI(Description);
    const Context = {
      subscriptions: [],
      extensionPath: Description.extensionLocation.fsPath,
      extensionUri: Description.extensionLocation,
      // Cast from internal URI
      storageUri: void 0,
      // Provided by StoragePath service
      globalStorageUri: void 0,
      // Provided by StoragePath service
      logUri: void 0,
      // Provided by Log service
      extensionMode: 1
      // Production
      // ... construct full context
    };
    const ActivationFunction = Module.activate;
    const Exports = ActivationFunction ? yield* _2(
      Effect.tryPromise({
        try: /* @__PURE__ */ __name(() => ActivationFunction.apply(globalThis, [Context]), "try"),
        // VS Code API is passed implicitly now
        catch: /* @__PURE__ */ __name((e) => new Error(
          `Activation function for '${Description.identifier.value}' failed: ${e}`
        ), "catch")
      })
    ) : Module;
    const Activated = {
      ID: Description.identifier,
      Module,
      Exports,
      Subscriptions: Context.subscriptions,
      ActivationFailed: false,
      ActivationError: null
    };
    yield* _2(
      Ref.update(
        ActivatedExtensions,
        (map) => map.set(Description.identifier.value, Activated)
      )
    );
    yield* _2(
      LogService.Info(
        `Successfully activated extension '${Description.identifier.value}'.`
      )
    );
    yield* _2(
      IPCService.SendNotification("$onDidActivateExtension", [
        Description.identifier
        // DTOs would be converted here
      ])
    );
  }).pipe(
    Effect.catchAll(
      (error) => Effect.gen(function* (_2) {
        const Activated = {
          ID: Description.identifier,
          Module: {},
          Exports: void 0,
          Subscriptions: [],
          ActivationFailed: true,
          ActivationError: error
        };
        yield* _2(
          Ref.update(
            ActivatedExtensions,
            (map) => map.set(Description.identifier.value, Activated)
          )
        );
        yield* _2(
          IPCService.SendNotification(
            "$onExtensionActivationError",
            [
              Description.identifier,
              {
                name: error.name,
                message: error.message,
                stack: error.stack
              }
            ]
          )
        );
      })
    )
  ), "DoActivateExtension");
  const ActivateById = /* @__PURE__ */ __name((ID, Reason) => Effect.gen(function* (_2) {
    if (IsActivated(ID)) return;
    const Description = yield* _2(GetExtensionDescription(ID));
    if (!Description) {
      yield* _2(
        LogService.Warn(
          `Cannot activate unknown extension '${ID.value}'.`
        )
      );
      return;
    }
    if (!Description.main) {
      yield* _2(
        LogService.Warn(
          `Cannot activate extension '${ID.value}' because it has no 'main' entry point.`
        )
      );
      return;
    }
    yield* _2(DoActivateExtension(Description, Reason));
  }), "ActivateById");
  const DeactivateAll = /* @__PURE__ */ __name(() => Ref.get(ActivatedExtensions).pipe(
    Effect.flatMap(
      (map) => Effect.forEach([...map.values()], Deactivate, {
        concurrency: "unbounded",
        discard: true
      })
    ),
    Effect.flatMap(() => Ref.set(ActivatedExtensions, /* @__PURE__ */ new Map())),
    Effect.asUnit
  ), "DeactivateAll");
  const ServiceImplementation = {
    ActivateById,
    GetExtensionDescription,
    GetExtensionExports,
    IsActivated,
    DeactivateAll
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
