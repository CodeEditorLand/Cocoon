var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Disposable } from "vscode";
import IPCService from "../IPC/Service.js";
import TelemetryService from "../Telemetry/Service.js";
import WindowService from "../Window/Service.js";
var Definition_default = Effect.gen(function* (G) {
  const IPC = yield* G(IPCService);
  const Telemetry = yield* G(TelemetryService);
  const Window = yield* G(WindowService);
  const CommandRegistryRef = yield* G(
    Ref.make(/* @__PURE__ */ new Map())
  );
  const ExecuteCommandEffect = /* @__PURE__ */ __name((ID, ...Arguments) => Effect.gen(function* (G2) {
    const Registry = yield* G2(Ref.get(CommandRegistryRef));
    const Entry = Registry.get(ID);
    if (Entry) {
      const { Handler, ThisArgument, Extension } = Entry;
      return yield* G2(
        Effect.tryPromise({
          try: /* @__PURE__ */ __name(() => Promise.resolve(
            Handler.apply(ThisArgument, Arguments)
          ), "try"),
          catch: /* @__PURE__ */ __name((e) => new Error(`Command '${ID}' execution failed: ${e}`), "catch")
        }).pipe(
          Effect.catchAll(
            (e) => Effect.sync(
              () => Telemetry.onExtensionError(
                Extension.identifier,
                e
              )
            ).pipe(Effect.andThen(Effect.fail(e)))
          )
        )
      );
    }
    const Result = yield* G2(
      IPC.SendRequest("$executeCommand", [ID, ...Arguments]).pipe(
        Effect.mapError((cause) => new Error(String(cause)))
      )
    );
    return Result;
  }), "ExecuteCommandEffect");
  const RegisterCommand = /* @__PURE__ */ __name((ID, Handler, IsTextEditorCommand, ThisArgument, Extension) => {
    const Entry = {
      Handler,
      ThisArgument,
      Extension,
      IsTextEditorCommand
    };
    const RegisterEffect = Ref.update(
      CommandRegistryRef,
      (map) => map.set(ID, Entry)
    ).pipe(
      Effect.flatMap(
        () => IPC.SendNotification("$registerCommand", [ID])
      )
    );
    Effect.runFork(RegisterEffect);
    return new Disposable(() => {
      const UnregisterEffect = Ref.update(
        CommandRegistryRef,
        (map) => (map.delete(ID), map)
      ).pipe(
        Effect.flatMap(
          () => IPC.SendNotification("$unregisterCommand", [ID])
        )
      );
      Effect.runFork(UnregisterEffect);
    });
  }, "RegisterCommand");
  const ServiceImplementation = {
    ExecuteCommand: ExecuteCommandEffect,
    RegisterCommand: /* @__PURE__ */ __name((ID, Handler, ThisArgument, Extension) => {
      return RegisterCommand(ID, Handler, false, ThisArgument, Extension);
    }, "RegisterCommand"),
    RegisterTextEditorCommand: /* @__PURE__ */ __name((ID, Handler, ThisArgument, Extension) => {
      const WrappedHandler = /* @__PURE__ */ __name((...args) => {
        const Editor = Window.activeTextEditor;
        if (!Editor) {
          console.warn(
            `Cannot execute text editor command "${ID}" without an active text editor.`
          );
          return;
        }
        return Editor.edit((editBuilder) => {
          Handler(Editor, editBuilder, ...args);
        });
      }, "WrappedHandler");
      return RegisterCommand(
        ID,
        WrappedHandler,
        true,
        ThisArgument,
        Extension
      );
    }, "RegisterTextEditorCommand"),
    GetCommands: /* @__PURE__ */ __name((FilterInternal = false) => IPC.SendRequest("$getCommands", []).pipe(
      Effect.mapError((cause) => new Error(String(cause))),
      Effect.flatMap(
        (RemoteCommands) => Ref.get(CommandRegistryRef).pipe(
          Effect.map((LocalRegistry) => {
            const LocalCommands = Array.from(
              LocalRegistry.keys()
            );
            const AllCommands = [
              .../* @__PURE__ */ new Set([
                ...RemoteCommands,
                ...LocalCommands
              ])
            ];
            return FilterInternal ? AllCommands.filter(
              (cmd) => !cmd.startsWith("_")
            ) : AllCommands;
          })
        )
      )
    ), "GetCommands")
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
