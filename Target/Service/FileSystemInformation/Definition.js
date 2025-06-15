var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, HashMap, Ref } from "effect";
import { isWindows } from "vs/base/common/platform.js";
import { ExtUri } from "vs/base/common/resources.js";
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files.js";
import { URI as URIConverter } from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
var Definition_default = Effect.gen(function* () {
  const IPC = yield* IPCService;
  const Log = yield* LogService;
  const CapabilitiesMap = yield* Ref.make(
    HashMap.empty()
  );
  const OnDidChangeFileEvent = CreateEventStream();
  const GetCapabilities = /* @__PURE__ */ __name((Scheme) => Ref.get(CapabilitiesMap).pipe(
    Effect.map(HashMap.get(Scheme)),
    Effect.map((MaybeCapabilities) => {
      if (MaybeCapabilities._tag === "Some") {
        return MaybeCapabilities.value;
      }
      if (Scheme === "file") {
        return isWindows ? FileSystemProviderCapabilities.FileReadWrite : FileSystemProviderCapabilities.FileReadWrite | FileSystemProviderCapabilities.PathCaseSensitive;
      }
      return void 0;
    })
  ), "GetCapabilities");
  const ExtURIInstance = new ExtUri((Uri) => {
    const Capabilities = Effect.runSync(GetCapabilities(Uri.scheme));
    const IgnoreCase = Capabilities ? !(Capabilities & FileSystemProviderCapabilities.PathCaseSensitive) : isWindows;
    Log.Trace(
      `ExtURI check for scheme '${Uri.scheme}', ignoring case: ${IgnoreCase}`
    );
    return IgnoreCase;
  });
  const AcceptProviderCapabilities = /* @__PURE__ */ __name((Scheme, Capabilities) => Effect.gen(function* () {
    if (Capabilities === null) {
      yield* Ref.update(CapabilitiesMap, HashMap.remove(Scheme));
      yield* Log.Trace(
        `Cleared capabilities for scheme '${Scheme}'.`
      );
    } else {
      yield* Ref.update(
        CapabilitiesMap,
        HashMap.set(Scheme, Capabilities)
      );
      yield* Log.Trace(
        `Updated capabilities for scheme '${Scheme}' to: ${Capabilities}`
      );
    }
  }), "AcceptProviderCapabilities");
  IPC.RegisterInvokeHandler(
    "$acceptProviderInfos",
    ([Scheme, Capabilities]) => Effect.runPromise(AcceptProviderCapabilities(Scheme, Capabilities))
  );
  IPC.RegisterInvokeHandler(
    "$onFileEvent",
    ([Events]) => OnDidChangeFileEvent.Fire(
      Events.map((Event) => ({
        type: Event.type,
        uri: URIConverter.ToAPI(Event.uri)
      }))
    ).pipe(Effect.runPromise)
  );
  const FileSystemInformationImplementation = {
    ExtURI: ExtURIInstance,
    GetCapabilities,
    onDidChangeFile: OnDidChangeFileEvent.event,
    isWritableFileSystem: /* @__PURE__ */ __name((Scheme) => {
      const Capabilities = Effect.runSync(GetCapabilities(Scheme));
      return Capabilities ? !(Capabilities & FileSystemProviderCapabilities.Readonly) : true;
    }, "isWritableFileSystem")
  };
  return FileSystemInformationImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
