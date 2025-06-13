var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Context, Effect, HashMap, Layer, ReadonlySet } from "effect";
import { InitData } from "./InitData.js";
import { Log } from "./Log.js";
const Tag = Context.Tag("Service/ProposedAPI");
function ParseConfiguration(Configuration) {
  const GlobalAPIs = /* @__PURE__ */ new Set();
  const ExtensionAPIs = /* @__PURE__ */ new Map();
  if (Array.isArray(Configuration)) {
    for (const Proposal of Configuration) {
      GlobalAPIs.add(Proposal);
    }
  } else if (typeof Configuration === "object" && Configuration !== null) {
    for (const Key in Configuration) {
      const Proposals = Configuration[Key];
      if (Array.isArray(Proposals)) {
        if (Key === "*") {
          for (const Proposal of Proposals) {
            GlobalAPIs.add(Proposal);
          }
        } else {
          const ExistingSet = ExtensionAPIs.get(Key) ?? /* @__PURE__ */ new Set();
          for (const Proposal of Proposals) {
            ExistingSet.add(Proposal);
          }
          ExtensionAPIs.set(Key, ExistingSet);
        }
      }
    }
  }
  return { GlobalAPIs, ExtensionAPIs };
}
__name(ParseConfiguration, "ParseConfiguration");
const Definition = Effect.gen(function* (_) {
  const InitDataService = yield* _(InitData.Tag);
  const LogService = yield* _(Log.Tag);
  const ProductConfiguration = ParseConfiguration(
    InitDataService.product?.extensionEnabledApiProposals
  );
  const EnvironmentConfiguration = ParseConfiguration(
    InitDataService.environment.extensionEnabledProposedApi
  );
  const AllGlobalAPIs = ReadonlySet.fromIterable([
    ...ProductConfiguration.GlobalAPIs,
    ...EnvironmentConfiguration.GlobalAPIs
  ]);
  const AllExtensionAPIs = new Map(ProductConfiguration.ExtensionAPIs);
  EnvironmentConfiguration.ExtensionAPIs.forEach((Proposals, ExtId) => {
    const Existing = AllExtensionAPIs.get(ExtId) ?? /* @__PURE__ */ new Set();
    Proposals.forEach((p) => Existing.add(p));
    AllExtensionAPIs.set(ExtId, Existing);
  });
  const ReadonlyExtensionAPIs = HashMap.fromEntries(
    AllExtensionAPIs.entries()
  );
  yield* _(
    LogService.Info(
      `Proposed API provider initialized. Globally enabled: ${ReadonlySet.size(AllGlobalAPIs)}. Per-extension configs: ${HashMap.size(ReadonlyExtensionAPIs)}.`
    )
  );
  const ServiceImplementation = {
    IsEnabled: /* @__PURE__ */ __name((ExtensionID, ProposalName) => {
      if (ReadonlySet.has(AllGlobalAPIs, ProposalName)) {
        return true;
      }
      const ExtensionProposals = HashMap.get(
        ReadonlyExtensionAPIs,
        ExtensionID.value
      );
      if (ExtensionProposals._tag === "Some") {
        return ExtensionProposals.value.has(ProposalName);
      }
      return false;
    }, "IsEnabled")
  };
  return ServiceImplementation;
});
const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(Log.Live));
export {
  Live,
  Tag
};
//# sourceMappingURL=ProposedAPI.js.map
