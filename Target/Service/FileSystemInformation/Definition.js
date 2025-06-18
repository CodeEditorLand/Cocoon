var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, HashMap, Ref } from "effect";
import { isWindows } from "vs/base/common/platform.js";
import { ExtUri } from "vs/base/common/resources.js";
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files.js";
import URIConverter from "../../TypeConverter/Main/URI.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
var Definition_default = Effect.gen(function* (G) {
  const IPC = yield* G(IPCService);
  const Log = yield* G(LogService);
  const CapabilitiesMapRef = yield* G(
    Ref.make(HashMap.empty())
  );
  const { event: OnDidChangeFileEvent, Fire: FireFileChangeEvent } = CreateEventStream();
  const GetCapabilitiesEffect = /* @__PURE__ */ __name((Scheme) => Ref.get(CapabilitiesMapRef).pipe(
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
  ), "GetCapabilitiesEffect");
  const ExtURIInstance = new ExtUri((Uri) => {
    const Capabilities = Effect.runSync(GetCapabilitiesEffect(Uri.scheme));
    const IgnoreCase = Capabilities ? !(Capabilities & FileSystemProviderCapabilities.PathCaseSensitive) : isWindows;
    Effect.runFork(
      Log.Trace(
        `ExtURI check for scheme '${Uri.scheme}', ignoring case: ${IgnoreCase}`
      )
    );
    return IgnoreCase;
  });
  const AcceptProviderCapabilitiesEffect = /* @__PURE__ */ __name((Scheme, Capabilities) => Effect.gen(function* (G2) {
    if (Capabilities === null) {
      yield* G2(
        Ref.update(CapabilitiesMapRef, HashMap.remove(Scheme))
      );
      yield* G2(
        Log.Trace(`Cleared capabilities for scheme '${Scheme}'.`)
      );
    } else {
      yield* G2(
        Ref.update(
          CapabilitiesMapRef,
          HashMap.set(Scheme, Capabilities)
        )
      );
      yield* G2(
        Log.Trace(
          `Updated capabilities for scheme '${Scheme}' to: ${Capabilities}`
        )
      );
    }
  }), "AcceptProviderCapabilitiesEffect");
  IPC.RegisterInvokeHandler(
    "$acceptProviderInfos",
    ([Scheme, Capabilities]) => Effect.runPromise(
      AcceptProviderCapabilitiesEffect(Scheme, Capabilities)
    )
  );
  IPC.RegisterInvokeHandler(
    "$onFileEvent",
    ([Events]) => Effect.runPromise(
      FireFileChangeEvent(
        Events.map((Event) => ({
          type: Event.type,
          uri: URIConverter.ToAPI(Event.uri)
        }))
      )
    )
  );
  const ServiceImplementation = {
    ExtURI: ExtURIInstance,
    GetCapabilities: GetCapabilitiesEffect,
    onDidChangeFile: OnDidChangeFileEvent,
    isWritableFileSystem: /* @__PURE__ */ __name((Scheme) => {
      const Capabilities = Effect.runSync(GetCapabilitiesEffect(Scheme));
      return Capabilities ? !(Capabilities & FileSystemProviderCapabilities.Readonly) : true;
    }, "isWritableFileSystem")
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
