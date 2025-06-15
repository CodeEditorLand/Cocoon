var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import CreateWorkSpaceConfiguration from "./CreateWorkSpaceConfiguration.js";
var Definition_default = Effect.gen(function* () {
  const IPC = yield* IPCService;
  const Log = yield* LogService;
  const ConfigCache = yield* Ref.make({});
  const OnDidChangeEvent = CreateEventStream();
  IPC.RegisterInvokeHandler(
    "$acceptConfigurationChanged",
    ([NewConfig, Change]) => Effect.gen(function* () {
      yield* Ref.set(ConfigCache, NewConfig);
      yield* OnDidChangeEvent.Fire({
        affectsConfiguration: /* @__PURE__ */ __name((Section, _Scope) => (
          // A real implementation would need to check the scope properly.
          Change.keys.includes(Section)
        ), "affectsConfiguration")
      });
    }).pipe(Effect.runPromise)
  );
  const ConfigurationImplementation = {
    GetConfiguration: /* @__PURE__ */ __name((Section, Scope) => IPC.SendRequest("$getConfiguration", [Section, Scope]).pipe(
      Effect.tap((NewConfig) => Ref.set(ConfigCache, NewConfig)),
      Effect.map(
        (NewConfig) => CreateWorkSpaceConfiguration(
          NewConfig,
          Section ?? "",
          IPC,
          Log
        )
      )
    ), "GetConfiguration"),
    onDidChangeConfiguration: OnDidChangeEvent.event
  };
  return ConfigurationImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
