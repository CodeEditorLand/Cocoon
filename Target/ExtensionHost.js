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
import { IPCService } from "./IPC.js";
import { InitDataService } from "./InitData.js";
import { LoggerService } from "./Logger.js";
import { TelemetryService } from "./Telemetry.js";
class ExtensionHostService extends Effect.Service()(
  "Service/ExtensionHost",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      const IPC = yield* IPCService;
      const InitData = yield* InitDataService;
      const Telemetry = yield* TelemetryService;
      const ActivatedExtensionsRef = yield* Ref.make(
        /* @__PURE__ */ new Map()
      );
      const ActivationEventsReader = {
        readActivationEvents: /* @__PURE__ */ __name((description) => ImplicitActivationEvents.readActivationEvents(description), "readActivationEvents")
      };
      const ExtensionRegistry = new ExtensionDescriptionRegistry(
        ActivationEventsReader,
        InitData.extensions.allExtensions
      );
      const Deactivate = /* @__PURE__ */ __name((Extension) => Effect.gen(function* () {
        yield* Logger.Info(
          `Deactivating extension '${Extension.Id.value}'...`
        );
        for (const Subscription of Extension.Subscriptions) {
          yield* Effect.tryPromise({
            try: /* @__PURE__ */ __name(() => Promise.resolve(Subscription.dispose()), "try"),
            catch: /* @__PURE__ */ __name((CaughtError) => Logger.Warn(
              `Error during subscription disposal for ${Extension.Id.value}`,
              CaughtError
            ), "catch")
          });
        }
        const DeactivateFunction = Extension.Module.deactivate;
        if (typeof DeactivateFunction === "function") {
          yield* Effect.tryPromise({
            try: /* @__PURE__ */ __name(() => Promise.resolve(DeactivateFunction()), "try"),
            catch: /* @__PURE__ */ __name((CaughtError) => new Error(
              `Deactivation function for '${Extension.Id.value}' failed: ${CaughtError}`
            ), "catch")
          }).pipe(
            Effect.catchAll(
              (error) => Logger.Error(error.message)
            )
          );
        }
      }).pipe(
        Effect.catchAllCause(
          (cause) => Logger.Warn("Deactivation error occurred", cause)
        )
      ), "Deactivate");
      const DoActivate = /* @__PURE__ */ __name((Description, Reason) => Effect.gen(function* () {
        yield* Logger.Info(
          `Activating extension '${Description.identifier.value}' (Reason: ${Reason.activationEvent}).`
        );
        const Module = yield* Effect.tryPromise({
          try: /* @__PURE__ */ __name(() => import(URI.revive(Description.extensionLocation).fsPath), "try"),
          catch: /* @__PURE__ */ __name((CaughtError) => new Error(
            `Failed to load module for '${Description.identifier.value}': ${CaughtError}`
          ), "catch")
        });
        const LanguageModelInfo = {
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
          languageModelAccessInformation: LanguageModelInfo,
          workspaceState: void 0,
          // Provided by Storage service
          globalState: void 0,
          // Provided by Storage service
          extensionRuntime: ExtensionRuntime.Node,
          messagePassingProtocol: void 0
        };
        const ActivationFunction = Module.activate;
        const Exports = ActivationFunction ? yield* Effect.tryPromise({
          try: /* @__PURE__ */ __name(() => Promise.resolve(
            ActivationFunction.apply(globalThis, [
              Context
            ])
          ), "try"),
          catch: /* @__PURE__ */ __name((CaughtError) => new Error(
            `Activation function for '${Description.identifier.value}' failed: ${CaughtError}`
          ), "catch")
        }) : Module;
        const Activated = {
          Id: Description.identifier,
          Module,
          Exports,
          Subscriptions: Context.subscriptions,
          ActivationFailed: false,
          ActivationError: null
        };
        yield* Ref.update(
          ActivatedExtensionsRef,
          (Map2) => Map2.set(Description.identifier.value, Activated)
        );
        yield* Logger.Info(
          `Successfully activated extension '${Description.identifier.value}'.`
        );
        yield* IPC.SendNotification("$onDidActivateExtension", [
          Description.identifier,
          [],
          []
        ]);
      }), "DoActivate");
      const OnDidActivateExtension = /* @__PURE__ */ __name((_callback) => Effect.sync(() => {
      }), "OnDidActivateExtension");
      return {
        // FIX: Added explicit types for Id and Reason.
        ActivateById: /* @__PURE__ */ __name((Id, Reason) => Effect.gen(function* () {
          const IsActivated = yield* Ref.get(
            ActivatedExtensionsRef
          ).pipe(Effect.map((Map2) => Map2.has(Id.value)));
          if (IsActivated) return;
          const MaybeDescription = ExtensionRegistry.getExtensionDescription(Id);
          if (!MaybeDescription)
            return yield* Logger.Warn(
              `Cannot activate unknown extension '${Id.value}'.`
            );
          if (!MaybeDescription.main)
            return yield* Logger.Warn(
              `Cannot activate extension '${Id.value}' because it has no 'main' entry point.`
            );
          yield* DoActivate(MaybeDescription, Reason);
        }).pipe(
          Effect.catchAll(
            (error) => Effect.gen(function* () {
              const ErrorToReport = error instanceof globalThis.Error ? error : new Error(String(error));
              const Activated = {
                Id,
                Module: {},
                Exports: void 0,
                Subscriptions: [],
                ActivationFailed: true,
                ActivationError: ErrorToReport
              };
              yield* Ref.update(
                ActivatedExtensionsRef,
                (Map2) => Map2.set(Id.value, Activated)
              );
              yield* IPC.SendNotification(
                "$onExtensionActivationError",
                [
                  Id,
                  {
                    name: ErrorToReport.name,
                    message: ErrorToReport.message,
                    stack: ErrorToReport.stack
                  }
                ]
              ).pipe(
                Effect.catchAllCause(
                  (cause) => Logger.Warn(
                    "Failed to send activation error notification",
                    cause
                  )
                )
              );
              yield* Effect.sync(
                () => Telemetry.onExtensionError(
                  Id,
                  ErrorToReport
                )
              );
            }).pipe(Effect.asVoid)
          )
        ), "ActivateById"),
        // FIX: Added explicit type for Id.
        GetExtensionDescription: /* @__PURE__ */ __name((Id) => Effect.succeed(
          ExtensionRegistry.getExtensionDescription(Id)
        ), "GetExtensionDescription"),
        // FIX: Added explicit type for Id.
        GetExtensionExports: /* @__PURE__ */ __name((Id) => Ref.get(ActivatedExtensionsRef).pipe(
          Effect.flatMap((Map2) => {
            const Ext = Map2.get(Id.value);
            if (Ext?.ActivationFailed && Ext.ActivationError)
              return Effect.fail(Ext.ActivationError);
            return Effect.succeed(Ext?.Exports);
          })
        ), "GetExtensionExports"),
        // FIX: Added explicit type for Id.
        IsActivated: /* @__PURE__ */ __name((Id) => Ref.get(ActivatedExtensionsRef).pipe(
          Effect.map((Map2) => Map2.has(Id.value))
        ), "IsActivated"),
        DeactivateAll: /* @__PURE__ */ __name(() => Ref.get(ActivatedExtensionsRef).pipe(
          Effect.flatMap(
            (Map2) => Effect.forEach([...Map2.values()], Deactivate, {
              concurrency: "unbounded",
              discard: true
            })
          ),
          Effect.andThen(
            Ref.set(ActivatedExtensionsRef, /* @__PURE__ */ new Map())
          )
        ), "DeactivateAll"),
        OnDidActivateExtension
      };
    })
  }
) {
  static {
    __name(this, "ExtensionHostService");
  }
}
export {
  ExtensionHostService
};
//# sourceMappingURL=ExtensionHost.js.map
