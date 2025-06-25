var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { IPCService } from "./IPC.js";
import { TelemetryService } from "./Telemetry.js";
import { WindowService } from "./Window.js";
class CommandService extends Effect.Service()(
  "Service/Command",
  {
    effect: Effect.gen(function* () {
      const IPC = yield* IPCService;
      yield* TelemetryService;
      yield* WindowService;
      const RegisterCommand = /* @__PURE__ */ __name((_global, id) => {
        return IPC.SendNotification("$registerCommand", [id]).pipe(
          Effect.map(() => ({ dispose: /* @__PURE__ */ __name(() => {
          }, "dispose") })),
          Effect.mapError((e) => e)
        );
      }, "RegisterCommand");
      const ExecuteCommand = /* @__PURE__ */ __name((id, ...args) => {
        return IPC.SendRequest("$executeCommand", [id, ...args]);
      }, "ExecuteCommand");
      const GetCommands = /* @__PURE__ */ __name((filterInternal = false) => {
        return IPC.SendRequest("$getCommands", [
          filterInternal
        ]);
      }, "GetCommands");
      const Service = {
        registerCommand: /* @__PURE__ */ __name((global, id, _handler, _thisArg, _metadata, _extension) => Effect.runSync(RegisterCommand(global, id)), "registerCommand"),
        registerTextEditorCommand: /* @__PURE__ */ __name((id, _handler, _thisArg, _metadata, _extension) => Effect.runSync(RegisterCommand(true, id)), "registerTextEditorCommand"),
        executeCommand: /* @__PURE__ */ __name((id, ...args) => Effect.runPromise(ExecuteCommand(id, ...args)), "executeCommand"),
        getCommands: /* @__PURE__ */ __name((filterInternal) => Effect.runPromise(GetCommands(filterInternal)), "getCommands")
      };
      return Service;
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
