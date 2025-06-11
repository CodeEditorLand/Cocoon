var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Path from "node:path";
import { Barrier, Effect, Ref, Stream } from "effect";
import { Uri } from "vscode";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { InitDataService } from "../InitData.js";
import { IpcProvider } from "../Ipc/mod.js";
import { FetchBundleEffect } from "./Support/FetchBundle.js";
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
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
  const GetPotentialBundleUris = /* @__PURE__ */ __name((Extension) => {
    const Language = InitData.environment.appLanguage || "en";
    const BasePath = Extension.l10n ? Path.join(Extension.extensionLocation.fsPath, Extension.l10n) : Extension.extensionLocation.fsPath;
    const DefaultBundleUri = Uri.file(
      Path.join(BasePath, "package.nls.json")
    );
    const LangBundleUri = Language !== "en" ? Uri.file(Path.join(BasePath, `package.nls.${Language}.json`)) : void 0;
    return { DefaultBundleUri, LangBundleUri };
  }, "GetPotentialBundleUris");
  const ServiceImplementation = {
    GetBundle: /* @__PURE__ */ __name((ExtensionId) => Ref.get(NlsCache).pipe(
      Effect.map((cache) => cache.get(ExtensionId))
    ), "GetBundle"),
    GetBundleUri: /* @__PURE__ */ __name(() => Effect.succeed(void 0), "GetBundleUri"),
    // This could be implemented to return one of the potential URIs.
    InitializeLocalizedMessages: /* @__PURE__ */ __name((Extension) => Effect.gen(function* (_2) {
      yield* _2(Barrier.await(InitBarrier));
      const { DefaultBundleUri, LangBundleUri } = GetPotentialBundleUris(Extension);
      const [DefaultContent, LangContent] = yield* _2(
        Effect.all([
          FetchBundleEffect(Ipc, DefaultBundleUri),
          LangBundleUri ? FetchBundleEffect(Ipc, LangBundleUri) : Effect.succeed({})
        ])
      );
      const FinalBundle = { ...DefaultContent, ...LangContent };
      if (Object.keys(FinalBundle).length > 0) {
        yield* _2(
          Ref.update(
            NlsCache,
            (cache) => cache.set(Extension.identifier.value, FinalBundle)
          )
        );
      }
    }), "InitializeLocalizedMessages"),
    OnDidInitializeLocalization: OnDidInitializeEvent.Stream,
    SignalLocalizationInitialized: /* @__PURE__ */ __name(() => Barrier.succeed(InitBarrier, void 0).pipe(Effect.asUnit), "SignalLocalizationInitialized")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
