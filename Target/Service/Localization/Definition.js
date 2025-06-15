var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Path from "node:path";
import { Barrier, Effect, Ref, Stream } from "effect";
import { Uri } from "vscode";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import InitDataService from "../InitData/Service.js";
import IPCService from "../IPC/Service.js";
import FetchBundle from "./Support/FetchBundle.js";
var Definition_default = Effect.gen(function* (_) {
  const IPC = yield* _(IPCService);
  const InitData = yield* _(InitDataService);
  const NlsCache = yield* _(
    Ref.make(/* @__PURE__ */ new Map())
  );
  const InitBarrier = yield* _(Barrier.make());
  const OnDidInitializeEvent = CreateEventStream();
  yield* _(
    Barrier.await(InitBarrier).pipe(
      Effect.flatMap(() => OnDidInitializeEvent.Fire()),
      Effect.forkDaemon
    )
  );
  const GetPotentialBundleURIs = /* @__PURE__ */ __name((Extension) => {
    const Language = InitData.environment.appLanguage || "en";
    const BaseURI = Uri.revive(Extension.extensionLocation);
    const BasePath = Extension.l10n ? Path.join(BaseURI.fsPath, Extension.l10n) : BaseURI.fsPath;
    const DefaultBundleURI = Uri.file(
      Path.join(BasePath, "package.nls.json")
    );
    const LanguageBundleURI = Language !== "en" ? Uri.file(Path.join(BasePath, `package.nls.${Language}.json`)) : void 0;
    return { DefaultBundleURI, LanguageBundleURI };
  }, "GetPotentialBundleURIs");
  const ServiceImplementation = {
    GetBundle: /* @__PURE__ */ __name((ExtensionID) => Ref.get(NlsCache).pipe(
      Effect.map((cache) => cache.get(ExtensionID))
    ), "GetBundle"),
    GetBundleURI: /* @__PURE__ */ __name((ExtensionID) => Effect.succeed(void 0), "GetBundleURI"),
    // This could be implemented to return one of the potential URIs.
    InitializeLocalizedMessages: /* @__PURE__ */ __name((Extension) => Effect.gen(function* (_2) {
      yield* _2(Barrier.await(InitBarrier));
      const { DefaultBundleURI, LanguageBundleURI } = GetPotentialBundleURIs(Extension);
      const [DefaultContent, LanguageContent] = yield* _2(
        Effect.all(
          [
            FetchBundle(IPC, DefaultBundleURI),
            LanguageBundleURI ? FetchBundle(IPC, LanguageBundleURI) : Effect.succeed({})
          ],
          { concurrency: "unbounded" }
        )
      );
      const FinalBundle = { ...DefaultContent, ...LanguageContent };
      if (Object.keys(FinalBundle).length > 0) {
        yield* _2(
          Ref.update(
            NlsCache,
            (cache) => cache.set(Extension.identifier.value, FinalBundle)
          )
        );
      }
    }), "InitializeLocalizedMessages"),
    onDidInitializeLocalization: Stream.toEvent(
      OnDidInitializeEvent.Stream
    ),
    SignalLocalizationInitialized: /* @__PURE__ */ __name(() => Barrier.succeed(InitBarrier, void 0).pipe(Effect.asVoid), "SignalLocalizationInitialized")
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
