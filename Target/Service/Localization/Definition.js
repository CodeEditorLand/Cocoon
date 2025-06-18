var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Path from "node:path";
import { Deferred, Effect, Option, Ref } from "effect";
import { URI } from "vs/base/common/uri.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import InitDataService from "../InitData/Service.js";
import IPCService from "../IPC/Service.js";
import FetchBundle from "./Support/FetchBundle.js";
var Definition_default = Effect.gen(function* () {
  const IPC = yield* IPCService;
  const InitData = yield* InitDataService;
  const NlsCache = yield* Ref.make(/* @__PURE__ */ new Map());
  const InitBarrier = yield* Deferred.make();
  const { event, Fire } = CreateEventStream();
  yield* Deferred.await(InitBarrier).pipe(
    Effect.flatMap(() => Fire()),
    Effect.forkDaemon
  );
  const GetPotentialBundleURIs = /* @__PURE__ */ __name((Extension) => {
    const Language = InitData.environment.appLanguage || "en";
    const BaseURI = URI.revive(Extension.extensionLocation);
    const BasePath = Extension.l10n ? Path.join(BaseURI.fsPath, Extension.l10n) : BaseURI.fsPath;
    const DefaultBundleURI = URI.file(
      Path.join(BasePath, "package.nls.json")
    );
    const LanguageBundleURI = Language !== "en" ? URI.file(Path.join(BasePath, `package.nls.${Language}.json`)) : void 0;
    return { DefaultBundleURI, LanguageBundleURI };
  }, "GetPotentialBundleURIs");
  const ServiceImplementation = {
    GetBundle: /* @__PURE__ */ __name((ExtensionID) => Ref.get(NlsCache).pipe(
      Effect.map(
        (cache) => Option.fromNullable(cache.get(ExtensionID))
      )
    ), "GetBundle"),
    GetBundleURI: /* @__PURE__ */ __name((_ExtensionID) => Effect.succeed(void 0), "GetBundleURI"),
    // This could be implemented to return one of the potential URIs.
    InitializeLocalizedMessages: /* @__PURE__ */ __name((Extension) => Effect.gen(function* () {
      yield* Deferred.await(InitBarrier);
      const { DefaultBundleURI, LanguageBundleURI } = GetPotentialBundleURIs(Extension);
      const [DefaultContent, LanguageContent] = yield* Effect.all(
        [
          FetchBundle(IPC, DefaultBundleURI),
          LanguageBundleURI ? FetchBundle(IPC, LanguageBundleURI) : Effect.succeed({})
        ],
        { concurrency: "unbounded" }
      );
      const FinalBundle = { ...DefaultContent, ...LanguageContent };
      if (Object.keys(FinalBundle).length > 0) {
        yield* Ref.update(
          NlsCache,
          (cache) => cache.set(Extension.identifier.value, FinalBundle)
        );
      }
    }).pipe(Effect.mapError((e) => e)), "InitializeLocalizedMessages"),
    onDidInitializeLocalization: event,
    SignalLocalizationInitialized: /* @__PURE__ */ __name(() => Deferred.succeed(InitBarrier, void 0).pipe(Effect.asVoid), "SignalLocalizationInitialized")
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
