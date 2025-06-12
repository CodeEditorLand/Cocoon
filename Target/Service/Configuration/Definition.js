var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IpcProvider } from "../Ipc/mod.js";
import { LogProvider } from "../Log.js";
import { CreateWorkspaceConfiguration } from "./CreateWorkspaceConfiguration.js";
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const Log = yield* _(LogProvider.Tag);
  const ConfigCache = yield* _(Ref.make({}));
  const OnDidChangeEvent = CreateEventStream();
  Ipc.RegisterInvokeHandler(
    "$acceptConfigurationChanged",
    ([change, newConfig]) => Effect.gen(function* (_2) {
      yield* _2(Ref.set(ConfigCache, newConfig));
      yield* _2(
        OnDidChangeEvent.Fire({
          affectsConfiguration: /* @__PURE__ */ __name((section, scope) => change.keys.includes(section), "affectsConfiguration")
        })
      );
    }).pipe(Effect.runPromise)
  );
  const ServiceImplementation = {
    GetConfiguration: /* @__PURE__ */ __name((Section, Scope) => Ipc.SendRequest("$getConfiguration", [Section, Scope]).pipe(
      Effect.tap((newConfig) => Ref.set(ConfigCache, newConfig)),
      Effect.map(
        (newConfig) => CreateWorkspaceConfiguration(
          newConfig,
          Section ?? "",
          Ipc,
          Log
        )
      )
    ), "GetConfiguration"),
    OnDidChangeConfiguration: OnDidChangeEvent.Stream
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
