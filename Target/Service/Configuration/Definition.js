var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref, Stream } from "effect";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC } from "../IPC.js";
import { Log } from "../Log.js";
import { CreateWorkSpaceConfiguration } from "./CreateWorkSpaceConfiguration.js";
const Definition = Effect.gen(function* (_) {
  const IPCService = yield* _(IPC.Tag);
  const LogService = yield* _(Log.Tag);
  const ConfigCache = yield* _(Ref.make({}));
  const OnDidChangeEvent = CreateEventStream();
  IPCService.RegisterInvokeHandler(
    "$acceptConfigurationChanged",
    ([newConfig, change]) => Effect.gen(function* (_2) {
      yield* _2(Ref.set(ConfigCache, newConfig));
      yield* _2(
        OnDidChangeEvent.Fire({
          affectsConfiguration: /* @__PURE__ */ __name((section, scope) => (
            // A real implementation would need to check the scope properly.
            change.keys.includes(section)
          ), "affectsConfiguration")
        })
      );
    }).pipe(Effect.runPromise)
  );
  const ServiceImplementation = {
    GetConfiguration: /* @__PURE__ */ __name((Section, Scope) => IPCService.SendRequest("$getConfiguration", [
      Section,
      Scope
    ]).pipe(
      Effect.tap((newConfig) => Ref.set(ConfigCache, newConfig)),
      Effect.map(
        (newConfig) => CreateWorkSpaceConfiguration(
          newConfig,
          Section ?? "",
          IPCService,
          LogService
        )
      )
    ), "GetConfiguration"),
    onDidChangeConfiguration: OnDidChangeEvent.Stream.pipe(Stream.toEvent)
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
