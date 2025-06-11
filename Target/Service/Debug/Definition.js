var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref, Stream } from "effect";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IpcProvider } from "../Ipc/mod.js";
import { RegisterProviderEffect } from "./RegisterProvider.js";
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const ConfigProviders = yield* _(Ref.make(/* @__PURE__ */ new Map()));
  const DescriptorFactories = yield* _(Ref.make(/* @__PURE__ */ new Map()));
  const OnDidChangeActiveDebugSessionEvent = CreateEventStream();
  Ipc.RegisterInvokeHandler(
    "$provideDebugConfigurations",
    ([handle, folder]) => Effect.gen(function* (_2) {
      const entry = (yield* _2(Ref.get(ConfigProviders))).get(handle);
    }).pipe(Effect.runPromise)
  );
  Ipc.RegisterInvokeHandler(
    "$resolveDebugConfiguration",
    ([handle, folder, config]) => Effect.gen(function* (_2) {
      const entry = (yield* _2(Ref.get(ConfigProviders))).get(handle);
    }).pipe(Effect.runPromise)
  );
  const ServiceImplementation = {
    // Events
    onDidChangeActiveDebugSession: OnDidChangeActiveDebugSessionEvent.Stream,
    get activeDebugSession() {
      return void 0;
    },
    // This would be managed by state from Mountain
    // Methods
    RegisterDebugConfigurationProvider: /* @__PURE__ */ __name((Type, Provider, Extension) => RegisterProviderEffect(
      ConfigProviders,
      Ipc,
      "$registerDebugConfigurationProvider",
      { Type, Provider, Extension }
    ), "RegisterDebugConfigurationProvider"),
    RegisterDebugAdapterDescriptorFactory: /* @__PURE__ */ __name((Type, Factory, Extension) => RegisterProviderEffect(
      DescriptorFactories,
      Ipc,
      "$registerDebugAdapterDescriptorFactory",
      { Type, Factory, Extension }
    ), "RegisterDebugAdapterDescriptorFactory"),
    StartDebugging: /* @__PURE__ */ __name((Folder, Config, Options) => Ipc.SendRequest("$startDebugging", [
      Folder?.uri,
      Config,
      Options
    ]).pipe(Effect.map((result) => !!result)), "StartDebugging")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
