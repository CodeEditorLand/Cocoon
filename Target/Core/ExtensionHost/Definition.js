var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Emitter } from "vs/base/common/event.js";
import { URI } from "vs/base/common/uri.js";
import { ImplicitActivationEvents } from "vs/platform/extensionManagement/common/implicitActivationEvents.js";
import { ExtensionRuntime } from "vs/workbench/api/common/extHostTypes.js";
import {
  ExtensionDescriptionRegistry
} from "vs/workbench/services/extensions/common/extensionDescriptionRegistry.js";
import InitDataService from "../../Service/InitData/Service.js";
import IPCService from "../../Service/IPC/Service.js";
import LogService from "../../Service/Log/Service.js";
import TelemetryService from "../../Service/Telemetry/Service.js";
var Definition_default = Effect.gen(function* (G) {
  const Log = yield* G(LogService);
  const IPC = yield* G(IPCService);
  const InitData = yield* G(InitDataService);
  const Telemetry = yield* G(TelemetryService);
  const ActivatedExtensionsRef = yield* G(
    Ref.make(/* @__PURE__ */ new Map())
  );
  const ActivationEventsReader = {
    readActivationEvents: /* @__PURE__ */ __name((desc) => ImplicitActivationEvents.readActivationEvents(desc), "readActivationEvents")
  };
  const ExtensionRegistry = new ExtensionDescriptionRegistry(
    ActivationEventsReader,
    InitData.extensions.allExtensions
  );
  const DeactivateEffect = /* @__PURE__ */ __name((Extension) => Effect.gen(function* (G2) {
    yield* G2(
      Log.Info(`Deactivating extension '${Extension.ID.value}'...`)
    );
    for (const Subscription of Extension.Subscriptions) {
      yield* G2(
        Effect.tryPromise({
          try: /* @__PURE__ */ __name(() => Promise.resolve(Subscription.dispose()), "try"),
          catch: /* @__PURE__ */ __name((CaughtError) => Log.Warn(
            `Error during subscription disposal for ${Extension.ID.value}`,
            CaughtError
          ), "catch")
        })
      );
    }
    const DeactivateFunction = Extension.Module.deactivate;
    if (typeof DeactivateFunction === "function") {
      yield* G2(
        Effect.tryPromise({
          try: /* @__PURE__ */ __name(() => Promise.resolve(DeactivateFunction()), "try"),
          catch: /* @__PURE__ */ __name((CaughtError) => new Error(
            `Deactivation function for '${Extension.ID.value}' failed: ${CaughtError}`
          ), "catch")
        }).pipe(
          Effect.catchAll((error) => Log.Error(error.message))
        )
      );
    }
  }).pipe(
    Effect.catchAllCause(
      (cause) => Log.Warn("Deactivation error occurred", cause)
    )
  ), "DeactivateEffect");
  const DoActivateExtensionEffect = /* @__PURE__ */ __name((Description, Reason) => Effect.gen(function* (G2) {
    yield* G2(
      Log.Info(
        `Activating extension '${Description.identifier.value}' (Reason: ${Reason.activationEvent}).`
      )
    );
    const Module = yield* G2(
      Effect.tryPromise({
        try: /* @__PURE__ */ __name(() => import(URI.revive(Description.extensionLocation).fsPath), "try"),
        catch: /* @__PURE__ */ __name((CaughtError) => new Error(
          `Failed to load module for '${Description.identifier.value}': ${CaughtError}`
        ), "catch")
      })
    );
    const LanguageModelAccessInformation = {
      onDidChange: new Emitter().event,
      canSendRequest: /* @__PURE__ */ __name((_chat) => false, "canSendRequest")
    };
    const Context = {
      subscriptions: [],
      extensionPath: URI.revive(Description.extensionLocation).fsPath,
      extensionUri: URI.revive(Description.extensionLocation),
      storageUri: URI.parse("file:///extension-storage"),
      // Stub
      globalStorageUri: URI.parse("file:///global-storage"),
      // Stub
      logUri: URI.parse("file:///logs"),
      // Stub
      extensionMode: 1,
      // Production
      secrets: void 0,
      // Provided by SecretStorage service
      storagePath: "/extension-storage",
      // Stub
      globalStoragePath: "/global-storage",
      // Stub
      logPath: "/logs",
      // Stub
      extension: void 0,
      // Lazily set
      environmentVariableCollection: void 0,
      // Stub
      asAbsolutePath: /* @__PURE__ */ __name((path) => path, "asAbsolutePath"),
      languageModelAccessInformation: LanguageModelAccessInformation,
      workspaceState: void 0,
      // Provided by Storage service
      globalState: void 0,
      // Provided by Storage service
      extensionRuntime: ExtensionRuntime.Node,
      messagePassingProtocol: void 0
    };
    const ActivationFunction = Module.activate;
    const Exports = ActivationFunction ? yield* G2(
      Effect.tryPromise({
        try: /* @__PURE__ */ __name(() => Promise.resolve(
          ActivationFunction.apply(globalThis, [
            Context
          ])
        ), "try"),
        catch: /* @__PURE__ */ __name((CaughtError) => new Error(
          `Activation function for '${Description.identifier.value}' failed: ${CaughtError}`
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
    yield* G2(
      Ref.update(
        ActivatedExtensionsRef,
        (Map2) => Map2.set(Description.identifier.value, Activated)
      )
    );
    yield* G2(
      Log.Info(
        `Successfully activated extension '${Description.identifier.value}'.`
      )
    );
    yield* G2(
      IPC.SendNotification("$onDidActivateExtension", [
        Description.identifier,
        [],
        // activationTimings
        []
        // TZe activation timing
      ])
    );
  }), "DoActivateExtensionEffect");
  const ActivateByIdEffect = /* @__PURE__ */ __name((ID, Reason) => {
    const ActivationLogic = Effect.gen(function* (G2) {
      const IsActivated = yield* G2(
        Ref.get(ActivatedExtensionsRef).pipe(
          Effect.map((Map2) => Map2.has(ID.value))
        )
      );
      if (IsActivated) {
        return;
      }
      const MaybeDescription = ExtensionRegistry.getExtensionDescription(ID);
      if (!MaybeDescription) {
        return yield* G2(
          Log.Warn(
            `Cannot activate unknown extension '${ID.value}'.`
          )
        );
      }
      if (!MaybeDescription.main) {
        return yield* G2(
          Log.Warn(
            `Cannot activate extension '${ID.value}' because it has no 'main' entry point.`
          )
        );
      }
      yield* G2(DoActivateExtensionEffect(MaybeDescription, Reason));
    });
    return ActivationLogic.pipe(
      Effect.catchAll((error) => {
        const ErrorHandlingEffect = Effect.gen(function* (G2) {
          const ErrorToReport = error instanceof globalThis.Error ? error : new Error(String(error));
          const Activated = {
            ID,
            Module: {},
            Exports: void 0,
            Subscriptions: [],
            ActivationFailed: true,
            ActivationError: ErrorToReport
          };
          yield* G2(
            Ref.update(
              ActivatedExtensionsRef,
              (Map2) => Map2.set(ID.value, Activated)
            )
          );
          yield* G2(
            IPC.SendNotification("$onExtensionActivationError", [
              ID,
              {
                name: ErrorToReport.name,
                message: ErrorToReport.message,
                stack: ErrorToReport.stack
              }
            ]).pipe(
              Effect.catchAllCause(
                (cause) => Log.Warn(
                  "Failed to send activation error notification",
                  cause
                )
              )
            )
          );
          yield* G2(
            Effect.sync(
              () => Telemetry.onExtensionError(ID, ErrorToReport)
            )
          );
        });
        return ErrorHandlingEffect.pipe(Effect.asVoid);
      })
    );
  }, "ActivateByIdEffect");
  const ServiceImplementation = {
    ActivateById: ActivateByIdEffect,
    GetExtensionDescription: /* @__PURE__ */ __name((ID) => Effect.succeed(ExtensionRegistry.getExtensionDescription(ID)), "GetExtensionDescription"),
    GetExtensionExports: /* @__PURE__ */ __name((ID) => Ref.get(ActivatedExtensionsRef).pipe(
      Effect.flatMap((Map2) => {
        const Ext = Map2.get(ID.value);
        if (Ext?.ActivationFailed && Ext.ActivationError) {
          return Effect.fail(Ext.ActivationError);
        }
        return Effect.succeed(Ext?.Exports);
      })
    ), "GetExtensionExports"),
    IsActivated: /* @__PURE__ */ __name((ID) => Ref.get(ActivatedExtensionsRef).pipe(
      Effect.map((Map2) => Map2.has(ID.value))
    ), "IsActivated"),
    DeactivateAll: /* @__PURE__ */ __name(() => Ref.get(ActivatedExtensionsRef).pipe(
      Effect.flatMap(
        (Map2) => Effect.forEach([...Map2.values()], DeactivateEffect, {
          concurrency: "unbounded",
          discard: true
        })
      ),
      Effect.andThen(Ref.set(ActivatedExtensionsRef, /* @__PURE__ */ new Map()))
    ), "DeactivateAll")
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
