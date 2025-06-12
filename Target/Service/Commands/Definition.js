var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Disposable } from "vscode";
import { CommandsConverter } from "../../TypeConverter/Commands.js";
import { IpcProvider } from "../Ipc/mod.js";
import { TelemetryProvider } from "../Telemetry.js";
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const Telemetry = yield* _(TelemetryProvider.Tag);
  const CommandRegistry = yield* _(
    Ref.make(/* @__PURE__ */ new Map())
  );
  const Converter = new CommandsConverter({}, {});
  const ExecuteCommandEffect = /* @__PURE__ */ __name((Id, ...Args) => Effect.gen(function* (_2) {
    const Registry = yield* _2(Ref.get(CommandRegistry));
    const Entry = Registry.get(Id);
    if (Entry) {
      const { Handler, ThisArg, Extension } = Entry;
      return yield* _2(
        Effect.tryPromise({
          try: /* @__PURE__ */ __name(() => Promise.resolve(Handler.apply(ThisArg, Args)), "try"),
          catch: /* @__PURE__ */ __name((e) => new Error(`Command '${Id}' execution failed: ${e}`), "catch")
        }),
        Effect.tapError(
          (e) => Telemetry.OnExtensionError(Extension.identifier, e)
        )
      );
    }
    const MarshalledArgs = Args.map((arg) => Converter.ToInternal(arg));
    const Result = yield* _2(
      Ipc.SendRequest("$executeCommand", [Id, MarshalledArgs])
    );
    return Converter.FromInternal(Result);
  }), "ExecuteCommandEffect");
  const ServiceImplementation = {
    ExecuteCommand: ExecuteCommandEffect,
    RegisterCommand: /* @__PURE__ */ __name((Id, Handler, ThisArg, Extension) => {
      const Entry = { Handler, ThisArg, Extension };
      const registerEffect = Ref.update(
        CommandRegistry,
        (map) => map.set(Id, Entry)
      ).pipe(
        Effect.flatMap(
          () => Ipc.SendNotification("$registerCommand", [Id])
        )
      );
      Effect.runFork(registerEffect);
      return new Disposable(() => {
        const unregisterEffect = Ref.update(
          CommandRegistry,
          (map) => (map.delete(Id), map)
        ).pipe(
          Effect.flatMap(
            () => Ipc.SendNotification("$unregisterCommand", [Id])
          )
        );
        Effect.runFork(unregisterEffect);
      });
    }, "RegisterCommand"),
    RegisterTextEditorCommand: /* @__PURE__ */ __name((Id, Handler, ThisArg, Extension) => {
      return ServiceImplementation.RegisterCommand(
        Id,
        Handler,
        ThisArg,
        Extension
      );
    }, "RegisterTextEditorCommand"),
    GetCommands: /* @__PURE__ */ __name((FilterInternal = false) => Ipc.SendRequest("getCommands", []).pipe(
      Effect.flatMap(
        (RemoteCommands) => Ref.get(CommandRegistry).pipe(
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
  Definition
};
//# sourceMappingURL=Definition.js.map
