var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, HashMap, Ref, Stream } from "effect";
import { isWindows } from "vs/base/common/platform.js";
import { ExtUri } from "vs/base/common/resources.js";
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files.js";
import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC } from "../IPC.js";
import { Log } from "../Log.js";
const Definition = Effect.gen(function* (_) {
  const IPCService = yield* _(IPC.Tag);
  const LogService = yield* _(Log.Tag);
  const CapabilitiesMap = yield* _(
    Ref.make(HashMap.empty())
  );
  const OnDidChangeFileEvent = CreateEventStream();
  const GetCapabilities = /* @__PURE__ */ __name((Scheme) => Ref.get(CapabilitiesMap).pipe(
    Effect.map(HashMap.get(Scheme)),
    Effect.map((maybeCaps) => {
      if (maybeCaps._tag === "Some") {
        return maybeCaps.value;
      }
      if (Scheme === "file") {
        return isWindows ? FileSystemProviderCapabilities.FileReadWrite : FileSystemProviderCapabilities.FileReadWrite | FileSystemProviderCapabilities.PathCaseSensitive;
      }
      return void 0;
    })
  ), "GetCapabilities");
  const ExtURIInstance = new ExtUri((uri) => {
    const caps = Effect.runSync(GetCapabilities(uri.scheme));
    const ignoreCase = caps ? !(caps & FileSystemProviderCapabilities.PathCaseSensitive) : isWindows;
    LogService.Trace(
      `ExtURI check for scheme '${uri.scheme}', ignoring case: ${ignoreCase}`
    );
    return ignoreCase;
  });
  const AcceptProviderCapabilities = /* @__PURE__ */ __name((Scheme, Capabilities) => Effect.gen(function* (_2) {
    if (Capabilities === null) {
      yield* _2(Ref.update(CapabilitiesMap, HashMap.remove(Scheme)));
      yield* _2(
        LogService.Trace(
          `Cleared capabilities for scheme '${Scheme}'.`
        )
      );
    } else {
      yield* _2(
        Ref.update(
          CapabilitiesMap,
          HashMap.set(Scheme, Capabilities)
        )
      );
      yield* _2(
        LogService.Trace(
          `Updated capabilities for scheme '${Scheme}' to: ${Capabilities}`
        )
      );
    }
  }), "AcceptProviderCapabilities");
  IPCService.RegisterInvokeHandler(
    "$acceptProviderInfos",
    ([scheme, caps]) => Effect.runPromise(AcceptProviderCapabilities(scheme, caps))
  );
  IPCService.RegisterInvokeHandler(
    "$onFileEvent",
    ([events]) => OnDidChangeFileEvent.Fire(
      events.map((e) => ({
        type: e.type,
        uri: TypeConverter.URIConverter.ToAPI(e.uri)
      }))
    ).pipe(Effect.runPromise)
  );
  const ServiceImplementation = {
    ExtURI: ExtURIInstance,
    GetCapabilities,
    onDidChangeFile: OnDidChangeFileEvent.Stream.pipe(Stream.toEvent),
    isWritableFileSystem: /* @__PURE__ */ __name((scheme) => {
      const caps = Effect.runSync(GetCapabilities(scheme));
      return caps ? !(caps & FileSystemProviderCapabilities.Readonly) : true;
    }, "isWritableFileSystem")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
