var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { ExtensionDescriptionRegistry } from "vs/workbench/services/extensions/common/extensionDescriptionRegistry.js";
import { InitDataService } from "../../Service/InitData.js";
import { IpcProvider } from "../../Service/Ipc.js";
import { LogProvider } from "../../Service/Log.js";
import { ApiFactoryProvider } from "../ApiFactory.js";
const Definition = Effect.gen(function* (_) {
  const Log = yield* _(LogProvider);
  const Ipc = yield* _(IpcProvider);
  const ApiFactory = yield* _(ApiFactoryProvider);
  const InitData = yield* _(InitDataService);
  const ExtensionRegistry = new ExtensionDescriptionRegistry(
    InitData.extensions
  );
  const ActivatedExtensions = yield* _(
    Ref.make(/* @__PURE__ */ new Map())
  );
  const IsActivated = /* @__PURE__ */ __name((Id) => Ref.get(ActivatedExtensions).pipe(
    Effect.map((map) => map.has(Id.value)),
    Effect.runSync
    // Safe because it's a synchronous Ref read
  ), "IsActivated");
  const GetExtensionExports = /* @__PURE__ */ __name((Id) => Ref.get(ActivatedExtensions).pipe(
    Effect.map((map) => map.get(Id.value)?.Exports),
    Effect.runSync
  ), "GetExtensionExports");
  const GetExtensionDescription = /* @__PURE__ */ __name((Id) => Effect.succeed(ExtensionRegistry.getExtensionDescription(Id)), "GetExtensionDescription");
  const Deactivate = /* @__PURE__ */ __name((Extension) => Effect.gen(function* (_2) {
    yield* _2(
      Log.Info(`Deactivating extension '${Extension.Id.value}'...`)
    );
    for (const Subscription of Extension.Subscriptions) {
      yield* _2(
        Effect.try(() => Subscription.dispose()).pipe(
          Effect.catchAll(() => Effect.unit)
        )
      );
    }
    const DeactivateFn = Extension.Module.deactivate;
    if (typeof DeactivateFn === "function") {
      yield* _2(
        Effect.tryPromise({
          try: /* @__PURE__ */ __name(() => DeactivateFn(), "try"),
          catch: /* @__PURE__ */ __name((e) => new Error(
            `Deactivation function for '${Extension.Id.value}' failed: ${e}`
          ), "catch")
        }).pipe(Effect.catchAll((e) => Log.Error(e.message)))
      );
    }
  }), "Deactivate");
  const DoActivateExtension = /* @__PURE__ */ __name((Description, Reason) => Effect.gen(function* (_2) {
    yield* _2(
      Log.Info(
        `Activating extension '${Description.identifier.value}' (Reason: ${Reason.activationEvent}).`
      )
    );
    const Module = yield* _2(
      Effect.tryPromise({
        try: /* @__PURE__ */ __name(() => import(Description.main), "try"),
        catch: /* @__PURE__ */ __name((e) => new Error(
          `Failed to load module for '${Description.identifier.value}': ${e}`
        ), "catch")
      })
    );
    const ExtensionApi = ApiFactory.CreateApi(Description);
    const Context2 = {
      subscriptions: [],
      extensionPath: Description.extensionLocation.fsPath,
      extensionUri: Description.extensionLocation
      // ... construct full context
    };
    const ActivationFn = Module.activate;
    const Exports = ActivationFn ? yield* _2(
      Effect.tryPromise({
        try: /* @__PURE__ */ __name(() => ActivationFn.apply(globalThis, [
          Context2,
          ExtensionApi
        ]), "try"),
        catch: /* @__PURE__ */ __name((e) => new Error(
          `Activation function for '${Description.identifier.value}' failed: ${e}`
        ), "catch")
      })
    ) : Module;
    const Activated = {
      Id: Description.identifier,
      Module,
      Exports,
      Subscriptions: Context2.subscriptions,
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
      Log.Info(
        `Successfully activated extension '${Description.identifier.value}'.`
      )
    );
    yield* _2(
      Ipc.SendNotification("$onDidActivateExtension", [
        Description.identifier,
        Reason.startup,
        Reason.extensionId,
        Reason.activationEvent
      ])
    );
  }).pipe(
    Effect.catchAll(
      (error) => Effect.gen(function* (_2) {
        const Activated = {
          Id: Description.identifier,
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
          Ipc.SendNotification("$onExtensionActivationError", [
            Description.identifier,
            {
              name: error.name,
              message: error.message,
              stack: error.stack
            }
          ])
        );
      })
    )
  ), "DoActivateExtension");
  const ActivateById = /* @__PURE__ */ __name((Id, Reason) => Effect.gen(function* (_2) {
    if (IsActivated(Id)) return;
    const Description = yield* _2(GetExtensionDescription(Id));
    if (!Description) {
      yield* _2(
        Log.Warn(
          `Cannot activate unknown extension '${Id.value}'.`
        )
      );
      return;
    }
    yield* _2(DoActivateExtension(Description, Reason));
  }), "ActivateById");
  const DeactivateAll = /* @__PURE__ */ __name(() => Ref.get(ActivatedExtensions).pipe(
    Effect.flatMap(
      (map) => Effect.forEach([...map.values()], Deactivate)
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
