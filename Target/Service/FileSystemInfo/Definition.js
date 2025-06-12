var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, HashMap, Ref } from "effect";
import { isWindows } from "vs/base/common/platform.js";
import { ExtUri } from "vs/base/common/resources.js";
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IpcProvider } from "../Ipc/mod.js";
import { LogProvider } from "../Log.js";
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const Log = yield* _(LogProvider.Tag);
  const CapabilitiesMap = yield* _(
    Ref.make(HashMap.empty())
  );
  const OnDidChangeFileEvent = CreateEventStream();
  const GetCapabilitiesEffect = /* @__PURE__ */ __name((Scheme) => Ref.get(CapabilitiesMap).pipe(
    Effect.map(HashMap.get(Scheme)),
    Effect.map((maybeCaps) => {
      if (maybeCaps.isSome()) {
        return maybeCaps.value;
      }
      if (Scheme === "file") {
        return isWindows ? FileSystemProviderCapabilities.FileReadWrite : FileSystemProviderCapabilities.FileReadWrite | FileSystemProviderCapabilities.PathCaseSensitive;
      }
      return void 0;
    })
  ), "GetCapabilitiesEffect");
  const ExtUriInstance = new ExtUri((uri) => {
    const caps = Effect.runSync(GetCapabilitiesEffect(uri.scheme));
    const ignoreCase = caps ? !(caps & FileSystemProviderCapabilities.PathCaseSensitive) : false;
    Log.Trace(
      `ExtUri check for scheme '${uri.scheme}', ignoring case: ${ignoreCase}`
    );
    return ignoreCase;
  });
  const AcceptProviderCapabilities = /* @__PURE__ */ __name((Uri, Capabilities) => Effect.gen(function* (_2) {
    if (!Uri.scheme) {
      return yield* _2(
        Log.Error(
          "Received provider capabilities info without a scheme.",
          Uri
        )
      );
    }
    if (Capabilities === null) {
      yield* _2(
        Ref.update(CapabilitiesMap, HashMap.remove(Uri.scheme))
      );
      yield* _2(
        Log.Trace(
          `Cleared capabilities for scheme '${Uri.scheme}'.`
        )
      );
    } else {
      yield* _2(
        Ref.update(
          CapabilitiesMap,
          HashMap.set(Uri.scheme, Capabilities)
        )
      );
      yield* _2(
        Log.Trace(
          `Updated capabilities for scheme '${Uri.scheme}' to: ${Capabilities}`
        )
      );
    }
  }), "AcceptProviderCapabilities");
  Ipc.RegisterInvokeHandler(
    "$acceptProviderInfos",
    ([uri, caps]) => Effect.runPromise(AcceptProviderCapabilities(uri, caps))
  );
  Ipc.RegisterInvokeHandler(
    "$onFileEvent",
    ([events]) => OnDidChangeFileEvent.Fire(events).pipe(Effect.runPromise)
  );
  const ServiceImplementation = {
    ExtUri: ExtUriInstance,
    GetCapabilities: GetCapabilitiesEffect,
    onDidChangeFile: OnDidChangeFileEvent.Stream,
    isWritableFileSystem: /* @__PURE__ */ __name((scheme) => {
      const caps = Effect.runSync(GetCapabilitiesEffect(scheme));
      return caps ? !(caps & FileSystemProviderCapabilities.Readonly) : true;
    }, "isWritableFileSystem")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
