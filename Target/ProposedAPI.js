var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, HashMap } from "effect";
import { LoggerService } from "./Logger.js";
const ParseConfiguration = /* @__PURE__ */ __name((Configuration) => {
  const GlobalAPIs = /* @__PURE__ */ new Set();
  const ExtensionAPIs = /* @__PURE__ */ new Map();
  if (Array.isArray(Configuration)) {
    for (const Proposal of Configuration) GlobalAPIs.add(Proposal);
  } else if (typeof Configuration === "object" && Configuration !== null) {
    for (const Key in Configuration) {
      const Proposals = Configuration[Key];
      if (Array.isArray(Proposals)) {
        if (Key === "*") {
          for (const Proposal of Proposals) GlobalAPIs.add(Proposal);
        } else {
          const ExistingSet = ExtensionAPIs.get(Key) ?? /* @__PURE__ */ new Set();
          for (const Proposal of Proposals) ExistingSet.add(Proposal);
          ExtensionAPIs.set(Key, ExistingSet);
        }
      }
    }
  }
  return { GlobalAPIs, ExtensionAPIs };
}, "ParseConfiguration");
class ProposedAPIService extends Effect.Service()(
  "Service/ProposedAPI",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      const ProductConfiguration = ParseConfiguration(void 0);
      const EnvironmentConfiguration = ParseConfiguration(void 0);
      const AllGlobalAPIs = /* @__PURE__ */ new Set([
        ...ProductConfiguration.GlobalAPIs,
        ...EnvironmentConfiguration.GlobalAPIs
      ]);
      const AllExtensionAPIs = new Map(
        ProductConfiguration.ExtensionAPIs
      );
      EnvironmentConfiguration.ExtensionAPIs.forEach(
        (Proposals, ExtensionId) => {
          const Existing = AllExtensionAPIs.get(ExtensionId) ?? /* @__PURE__ */ new Set();
          Proposals.forEach((p) => Existing.add(p));
          AllExtensionAPIs.set(ExtensionId, Existing);
        }
      );
      const ReadonlyExtensionAPIs = HashMap.fromIterable(
        AllExtensionAPIs.entries()
      );
      yield* Logger.Info(
        "Proposed API provider initialized. No proposals found in InitData. All proposals will be disabled."
      );
      const IsEnabled = /* @__PURE__ */ __name((ExtensionId, ProposalName) => {
        if (AllGlobalAPIs.has(ProposalName)) return true;
        const ExtensionProposals = HashMap.get(
          ReadonlyExtensionAPIs,
          ExtensionId.value
        );
        if (ExtensionProposals._tag === "Some") {
          return ExtensionProposals.value.has(ProposalName);
        }
        return false;
      }, "IsEnabled");
      return { IsEnabled };
    })
  }
) {
  static {
    __name(this, "ProposedAPIService");
  }
}
export {
  ProposedAPIService
};
//# sourceMappingURL=ProposedAPI.js.map
