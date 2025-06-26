var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";
import { WindowService } from "./Window.js";
class CommandService extends Effect.Service()(
  "Service/Command",
  {
    effect: Effect.gen(function* () {
      const IPC = yield* IPCService;
      const Logger = yield* LoggerService;
      const Window = yield* WindowService;
      const CommandsReference = yield* Ref.make(
        /* @__PURE__ */ new Map()
      );
      const MainThreadProxy = IPC.CreateProxy(
        "$rpc:mainThreadCommands"
      );
      const ExecuteLocalCommand = /* @__PURE__ */ __name((Command, Arguments) => Effect.tryPromise({
        try: /* @__PURE__ */ __name(async () => {
          const { Callback, ThisArg, Extension } = Command;
          if (Extension) {
          }
          return Callback.apply(ThisArg, Arguments);
        }, "try"),
        catch: /* @__PURE__ */ __name((Cause) => Cause, "catch")
      }), "ExecuteLocalCommand");
      IPC.RegisterInvokeHandler(
        "$executeContributedCommand",
        ([Id, ...Arguments]) => Effect.runPromise(
          Ref.get(CommandsReference).pipe(
            Effect.flatMap(
              (Map2) => Effect.fromNullable(Map2.get(Id))
            ),
            Effect.flatMap(
              (Command) => ExecuteLocalCommand(
                Command,
                Arguments
              )
            ),
            Effect.catchAll(
              (Error2) => Logger.Error(
                `Failed to execute local command '${Id}'`,
                Error2
              ).pipe(Effect.as(void 0))
            )
          )
        )
      );
      const ServiceImplementation = {
        registerCommand: /* @__PURE__ */ __name((Global, Id, Callback, ThisArg) => {
          const CommandRegistration = Ref.update(
            CommandsReference,
            (Map2) => Map2.set(Id, {
              Id,
              Callback,
              ThisArg,
              Extension: void 0
              // TODO: This needs to be captured from the context
            })
          ).pipe(
            Effect.tap(
              () => Logger.Trace(`Command '${Id}' registered.`)
            )
          );
          Effect.runSync(CommandRegistration);
          if (Global) {
            MainThreadProxy.$registerCommand(Id);
          }
          return {
            dispose: /* @__PURE__ */ __name(() => {
              const Cleanup = Ref.update(
                CommandsReference,
                (Map2) => (Map2.delete(Id), Map2)
              ).pipe(
                Effect.tap(() => {
                  if (Global) {
                    MainThreadProxy.$unregisterCommand(Id);
                  }
                })
              );
              Effect.runFork(Cleanup);
            }, "dispose")
          };
        }, "registerCommand"),
        registerTextEditorCommand: /* @__PURE__ */ __name((Id, Callback, ThisArg) => {
          const AdaptedCallback = /* @__PURE__ */ __name((...args) => {
            const ActiveEditor = Window.activeTextEditor;
            if (!ActiveEditor) {
              Effect.runSync(
                Logger.Warn(
                  `Cannot execute text editor command '${Id}' because there is no active text editor.`
                )
              );
              return void 0;
            }
            return ActiveEditor.edit((editBuilder) => {
              Callback.apply(ThisArg, [
                ActiveEditor,
                editBuilder,
                ...args
              ]);
            });
          }, "AdaptedCallback");
          return ServiceImplementation.registerCommand(
            true,
            Id,
            AdaptedCallback
          );
        }, "registerTextEditorCommand"),
        executeCommand: /* @__PURE__ */ __name(async (Id, ...Arguments) => {
          const AllCommands = await Effect.runPromise(
            Ref.get(CommandsReference)
          );
          if (AllCommands.has(Id)) {
            return Effect.runPromise(
              ExecuteLocalCommand(
                AllCommands.get(Id),
                Arguments
              )
            );
          }
          return MainThreadProxy.$executeCommand(
            Id,
            Arguments,
            true
          );
        }, "executeCommand"),
        // FIX: MainThreadCommandsShape.$getCommands takes no arguments.
        GetCommands: /* @__PURE__ */ __name((_FilterInternal = false) => MainThreadProxy.$getCommands(), "GetCommands")
      };
      return ServiceImplementation;
    })
  }
) {
  static {
    __name(this, "CommandService");
  }
}
export {
  CommandService
};
//# sourceMappingURL=Command.js.map
