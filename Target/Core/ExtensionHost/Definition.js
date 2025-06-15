var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { ExtensionDescriptionRegistry } from "vs/workbench/services/extensions/common/extensionDescriptionRegistry.js";
import InitDataService from "../../Service/InitData/Service.js";
import IPCService from "../../Service/IPC/Service.js";
import LogService from "../../Service/Log/Service.js";
import APIFactoryService from "../APIFactory/Service.js";
var Definition_default = Effect.gen(function* () {
  const Log = yield* LogService;
  const IPC = yield* IPCService;
  const APIFactory = yield* APIFactoryService;
  const InitData = yield* InitDataService;
  const ExtensionRegistry = new ExtensionDescriptionRegistry(
    InitData.extensions
  );
  const ActivatedExtensions = yield* Ref.make(
    /* @__PURE__ */ new Map()
  );
  const Deactivate = /* @__PURE__ */ __name((Extension) => Effect.gen(function* () {
    yield* Log.Info(
      `Deactivating extension '${Extension.ID.value}'...`
    );
    for (const Subscription of Extension.Subscriptions) {
      yield* Effect.try({
        try: /* @__PURE__ */ __name(() => Subscription.dispose(), "try"),
        catch: /* @__PURE__ */ __name((CaughtError) => Log.Warn(
          `Error during subscription disposal for ${Extension.ID.value}`,
          CaughtError
        ), "catch")
      });
    }
    const DeactivateFunction = Extension.Module.deactivate;
    if (typeof DeactivateFunction === "function") {
      yield* Effect.tryPromise({
        try: /* @__PURE__ */ __name(() => DeactivateFunction(), "try"),
        catch: /* @__PURE__ */ __name((CaughtError) => new Error(
          `Deactivation function for '${Extension.ID.value}' failed: ${CaughtError}`
        ), "catch")
      }).pipe(Effect.catchAll((Error2) => Log.Error(Error2.message)));
    }
  }), "Deactivate");
  const DoActivateExtension = /* @__PURE__ */ __name((Description, Reason) => Effect.gen(function* () {
    yield* Log.Info(
      `Activating extension '${Description.identifier.value}' (Reason: ${Reason.activationEvent}).`
    );
    const Module = yield* Effect.tryPromise({
      try: /* @__PURE__ */ __name(() => import(Description.main), "try"),
      catch: /* @__PURE__ */ __name((CaughtError) => new Error(
        `Failed to load module for '${Description.identifier.value}': ${CaughtError}`
      ), "catch")
    });
    const Context = {
      subscriptions: [],
      extensionPath: Description.extensionLocation.fsPath,
      extensionUri: Description.extensionLocation,
      storageUri: void 0,
      globalStorageUri: void 0,
      logUri: void 0,
      extensionMode: 1,
      // Production
      secrets: void 0,
      storagePath: void 0,
      globalStoragePath: void 0,
      logPath: void 0,
      extension: void 0,
      environmentVariableCollection: void 0,
      asAbsolutePath: /* @__PURE__ */ __name((path) => path, "asAbsolutePath")
    };
    const ActivationFunction = Module.activate;
    const Exports = ActivationFunction ? yield* Effect.tryPromise({
      try: /* @__PURE__ */ __name(() => ActivationFunction.apply(globalThis, [Context]), "try"),
      catch: /* @__PURE__ */ __name((CaughtError) => new Error(
        `Activation function for '${Description.identifier.value}' failed: ${CaughtError}`
      ), "catch")
    }) : Module;
    const Activated = {
      ID: Description.identifier,
      Module,
      Exports,
      Subscriptions: Context.subscriptions,
      ActivationFailed: false,
      ActivationError: null
    };
    yield* Ref.update(
      ActivatedExtensions,
      (Map2) => Map2.set(Description.identifier.value, Activated)
    );
    yield* Log.Info(
      `Successfully activated extension '${Description.identifier.value}'.`
    );
    yield* IPC.SendNotification("$onDidActivateExtension", [
      Description.identifier
    ]);
  }).pipe(
    // This catch block handles failures during the activation process
    Effect.catchAll(
      (Error2) => Effect.gen(function* () {
        const Activated = {
          ID: Description.identifier,
          Module: {},
          Exports: void 0,
          Subscriptions: [],
          ActivationFailed: true,
          ActivationError: Error2 instanceof globalThis.Error ? Error2 : new Error2(String(Error2))
        };
        yield* Ref.update(
          ActivatedExtensions,
          (Map2) => Map2.set(Description.identifier.value, Activated)
        );
        yield* IPC.SendNotification("$onExtensionActivationError", [
          Description.identifier,
          {
            name: Error2 instanceof globalThis.Error ? Error2.name : "UnknownError",
            message: Error2 instanceof globalThis.Error ? Error2.message : String(Error2),
            stack: Error2 instanceof globalThis.Error ? Error2.stack : void 0
          }
        ]);
      })
    )
  ), "DoActivateExtension");
  const ActivateById = /* @__PURE__ */ __name((ID, Reason) => Effect.gen(function* () {
    const IsAlreadyActivated = yield* Ref.get(ActivatedExtensions).pipe(
      Effect.map((Map2) => Map2.has(ID.value))
    );
    if (IsAlreadyActivated) return;
    const MaybeDescription = ExtensionRegistry.getExtensionDescription(ID);
    if (!MaybeDescription) {
      return yield* Log.Warn(
        `Cannot activate unknown extension '${ID.value}'.`
      );
    }
    if (!MaybeDescription.main) {
      return yield* Log.Warn(
        `Cannot activate extension '${ID.value}' because it has no 'main' entry point.`
      );
    }
    yield* DoActivateExtension(MaybeDescription, Reason);
  }).pipe(
    Effect.mapError(
      (Error2) => Error2 instanceof globalThis.Error ? Error2 : new Error2(String(Error2))
    )
  ), "ActivateById");
  const ServiceImplementation = {
    ActivateById,
    GetExtensionDescription: /* @__PURE__ */ __name((ID) => Effect.succeed(ExtensionRegistry.getExtensionDescription(ID)), "GetExtensionDescription"),
    GetExtensionExports: /* @__PURE__ */ __name((ID) => Ref.get(ActivatedExtensions).pipe(
      Effect.map((Map2) => Map2.get(ID.value)?.Exports)
    ), "GetExtensionExports"),
    IsActivated: /* @__PURE__ */ __name((ID) => Ref.get(ActivatedExtensions).pipe(
      Effect.map((Map2) => Map2.has(ID.value))
    ), "IsActivated"),
    DeactivateAll: /* @__PURE__ */ __name(() => Ref.get(ActivatedExtensions).pipe(
      Effect.flatMap(
        (Map2) => Effect.forEach([...Map2.values()], Deactivate, {
          concurrency: "unbounded",
          discard: true
        })
      ),
      Effect.flatMap(() => Ref.set(ActivatedExtensions, /* @__PURE__ */ new Map())),
      Effect.asVoid
    ), "DeactivateAll")
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
