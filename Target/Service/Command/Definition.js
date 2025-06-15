var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Disposable } from "vscode";
import TypeConverter from "../../TypeConverter/Command.js";
import IPCService from "../IPC/Service.js";
import TelemetryService from "../Telemetry/Service.js";
import WorkSpaceService from "../WorkSpace/Service.js";
var Definition_default = Effect.gen(function* () {
  const IPC = yield* IPCService;
  const Telemetry = yield* TelemetryService;
  const WorkSpace = yield* WorkSpaceService;
  const CommandRegistry = yield* Ref.make(
    /* @__PURE__ */ new Map()
  );
  const CommandConverter = new TypeConverter.Definition(
    {},
    () => void 0
  );
  const ExecuteCommand = /* @__PURE__ */ __name((ID, ...Arguments) => Effect.gen(function* () {
    const Registry = yield* Ref.get(CommandRegistry);
    const Entry = Registry.get(ID);
    if (Entry) {
      const { Handler, ThisArgument, Extension } = Entry;
      return yield* Effect.tryPromise({
        try: /* @__PURE__ */ __name(() => Promise.resolve(Handler.apply(ThisArgument, Arguments)), "try"),
        catch: /* @__PURE__ */ __name((e) => new Error(`Command '${ID}' execution failed: ${e}`), "catch")
      }).pipe(
        Effect.catchAll(
          (e) => Effect.flatMap(
            Telemetry.onExtensionError(
              Extension.identifier,
              e
            ),
            () => Effect.fail(e)
          )
        )
      );
    }
    const MarshalledArguments = Arguments.map(
      (arg) => CommandConverter.ToInternal(arg, [])
    );
    const Result = yield* IPC.SendRequest("$executeCommand", [
      ID,
      ...MarshalledArguments
    ]);
    return CommandConverter.FromInternal(Result);
  }), "ExecuteCommand");
  const Register = /* @__PURE__ */ __name((ID, Handler, IsTextEditorCommand, ThisArgument, Extension) => {
    const Entry = {
      Handler,
      ThisArgument,
      Extension,
      IsTextEditorCommand
    };
    const registerEffect = Ref.update(
      CommandRegistry,
      (map) => map.set(ID, Entry)
    ).pipe(
      Effect.flatMap(
        () => IPC.SendNotification("$registerCommand", [ID])
      )
    );
    Effect.runFork(registerEffect);
    return new Disposable(() => {
      const unregisterEffect = Ref.update(
        CommandRegistry,
        (map) => (map.delete(ID), map)
      ).pipe(
        Effect.flatMap(
          () => IPC.SendNotification("$unregisterCommand", [ID])
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
        const editor = WorkSpace.activeTextEditor;
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
    GetCommands: /* @__PURE__ */ __name((FilterInternal = false) => IPC.SendRequest("$getCommands", []).pipe(
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
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
