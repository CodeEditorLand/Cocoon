var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Disposable } from "vscode";
import * as TypeConverter from "../../TypeConverter.js";
import { IPC } from "../IPC.js";
import { Telemetry } from "../Telemetry.js";
import { WorkSpace } from "../WorkSpace.js";
const Definition = Effect.gen(function* (_) {
  const IPCService = yield* _(IPC.Tag);
  const TelemetryService = yield* _(Telemetry.Tag);
  const WorkSpaceService = yield* _(WorkSpace.Tag);
  const CommandRegistry = yield* _(
    Ref.make(/* @__PURE__ */ new Map())
  );
  const CommandConverter = new TypeConverter.Command.Definition(
    {},
    () => void 0
  );
  const ExecuteCommand = /* @__PURE__ */ __name((ID, ...Arguments) => Effect.gen(function* (_2) {
    const Registry = yield* _2(Ref.get(CommandRegistry));
    const Entry = Registry.get(ID);
    if (Entry) {
      const { Handler, ThisArgument, Extension } = Entry;
      return yield* _2(
        Effect.tryPromise({
          try: /* @__PURE__ */ __name(() => Promise.resolve(
            Handler.apply(ThisArgument, Arguments)
          ), "try"),
          catch: /* @__PURE__ */ __name((e) => new Error(`Command '${ID}' execution failed: ${e}`), "catch")
        }),
        Effect.tapError(
          (e) => TelemetryService.onExtensionError(
            Extension.identifier,
            e
          )
        )
      );
    }
    const MarshalledArguments = Arguments.map(
      (arg) => CommandConverter.ToInternal(arg, [])
    );
    const Result = yield* _2(
      IPCService.SendRequest("$executeCommand", [
        ID,
        ...MarshalledArguments
      ])
    );
    return CommandConverter.FromInternal(Result);
  }), "ExecuteCommand");
  const Register = /* @__PURE__ */ __name((ID, Handler, IsTextEditorCommand, ThisArgument, Extension) => {
    const Entry = {
      Handler,
      ThisArgument,
      Extension,
      // Assume it's always provided internally
      IsTextEditorCommand
    };
    const registerEffect = Ref.update(
      CommandRegistry,
      (map) => map.set(ID, Entry)
    ).pipe(
      Effect.flatMap(
        () => IPCService.SendNotification("$registerCommand", [ID])
      )
    );
    Effect.runFork(registerEffect);
    return new Disposable(() => {
      const unregisterEffect = Ref.update(
        CommandRegistry,
        (map) => (map.delete(ID), map)
      ).pipe(
        Effect.flatMap(
          () => IPCService.SendNotification("$unregisterCommand", [ID])
        )
      );
      Effect.runFork(unregisterEffect);
    });
  }, "Register");
  const ServiceImplementation = {
    ExecuteCommand,
    RegisterCommand: /* @__PURE__ */ __name((ID, Handler, ThisArgument, Extension) => {
      return Register(ID, Handler, false, ThisArgument, Extension);
    }, "RegisterCommand"),
    RegisterTextEditorCommand: /* @__PURE__ */ __name((ID, Handler, ThisArgument, Extension) => {
      const WrappedHandler = /* @__PURE__ */ __name((...args) => {
        const editor = WorkSpaceService.activeTextEditor;
        if (!editor) {
          console.warn(
            `Cannot execute text editor command "${ID}" without an active text editor.`
          );
          return;
        }
        return editor.edit((editBuilder) => {
          Handler(editor, editBuilder, ...args);
        });
      }, "WrappedHandler");
      return Register(ID, WrappedHandler, true, ThisArgument, Extension);
    }, "RegisterTextEditorCommand"),
    GetCommands: /* @__PURE__ */ __name((FilterInternal = false) => IPCService.SendRequest("$getCommands", []).pipe(
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
  CommandConverter.CommandService = ServiceImplementation;
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
