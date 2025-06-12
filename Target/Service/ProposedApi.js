var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Context, Effect, HashMap, Layer, ReadonlySet } from "effect";
import { InitDataService } from "./InitData.js";
import { LogProvider } from "./Log.js";
const Tag = Context.Tag("Service/ProposedApi");
const ParseConfig = /* @__PURE__ */ __name((Config) => {
  const GlobalApis = /* @__PURE__ */ new Set();
  const ExtensionApis = /* @__PURE__ */ new Map();
  if (Array.isArray(Config)) {
    for (const Proposal of Config) {
      GlobalApis.add(Proposal);
    }
  } else if (typeof Config === "object" && Config !== null) {
    for (const Key in Config) {
      const Proposals = Config[Key];
      if (Array.isArray(Proposals)) {
        if (Key === "*") {
          for (const Proposal of Proposals) {
            GlobalApis.add(Proposal);
          }
        } else {
          const ExistingSet = ExtensionApis.get(Key) ?? /* @__PURE__ */ new Set();
          for (const Proposal of Proposals) {
            ExistingSet.add(Proposal);
          }
          ExtensionApis.set(Key, ExistingSet);
        }
      }
    }
  }
  return { GlobalApis, ExtensionApis };
}, "ParseConfig");
const Definition = Effect.gen(function* (_) {
  const InitData = yield* _(InitDataService);
  const Log = yield* _(LogProvider.Tag);
  const ProductConfig = ParseConfig(
    InitData.product?.extensionEnabledApiProposals
  );
  const EnvConfig = ParseConfig(
    InitData.environment.extensionEnabledProposedApi
  );
  const AllGlobalApis = ReadonlySet.fromIterable([
    ...ProductConfig.GlobalApis,
    ...EnvConfig.GlobalApis
  ]);
  const AllExtensionApis = new Map(ProductConfig.ExtensionApis);
  EnvConfig.ExtensionApis.forEach((Proposals, ExtId) => {
    const Existing = AllExtensionApis.get(ExtId) ?? /* @__PURE__ */ new Set();
    Proposals.forEach((p) => Existing.add(p));
    AllExtensionApis.set(ExtId, Existing);
  });
  const ReadonlyExtensionApis = HashMap.fromEntries(
    AllExtensionApis.entries()
  );
  yield* _(
    Log.Info(
      `Proposed API provider initialized. Globally enabled: ${ReadonlySet.size(AllGlobalApis)}. Per-extension configs: ${HashMap.size(ReadonlyExtensionApis)}.`
    )
  );
  const ServiceImplementation = {
    IsEnabled: /* @__PURE__ */ __name((ExtensionId, ProposalName) => {
      if (ReadonlySet.has(AllGlobalApis, ProposalName)) {
        return true;
      }
      const ExtensionProposals = HashMap.get(
        ReadonlyExtensionApis,
        ExtensionId.value
      );
      return ExtensionProposals.pipe(
        Effect.map((set) => set.has(ProposalName)),
        Effect.runSync
      ) ?? false;
    }, "IsEnabled")
  };
  return ServiceImplementation;
});
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(LogProvider.Live)
);
export {
  Live,
  Tag
};
//# sourceMappingURL=ProposedApi.js.map
