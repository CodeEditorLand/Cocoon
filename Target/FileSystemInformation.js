var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { isWindows } from "@codeeditorland/output/vs/base/common/platform.js";
import {
  ExtUri
} from "@codeeditorland/output/vs/base/common/resources.js";
import { FileSystemProviderCapabilities } from "@codeeditorland/output/vs/platform/files/common/files.js";
import { Effect, HashMap, Ref } from "effect";
import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";
import { ToAPI } from "./TypeConverter/Main/URI.js";
import { CreateEventStream } from "./Utility/EventStream.js";
class FileSystemInformationService extends Effect.Service()(
  "Service/FileSystemInformation",
  {
    effect: Effect.gen(function* () {
      const IPC = yield* IPCService;
      const Logger = yield* LoggerService;
      const CapabilitiesMapRef = yield* Ref.make(
        HashMap.empty()
      );
      const { event: OnDidChangeFileEvent, Fire: FireFileChangeEvent } = CreateEventStream();
      const GetCapabilities = /* @__PURE__ */ __name((Scheme) => Ref.get(CapabilitiesMapRef).pipe(
        Effect.map(HashMap.get(Scheme)),
        Effect.map((MaybeCapabilities) => {
          if (MaybeCapabilities._tag === "Some")
            return MaybeCapabilities.value;
          if (Scheme === "file") {
            return isWindows ? FileSystemProviderCapabilities.FileReadWrite : FileSystemProviderCapabilities.FileReadWrite | FileSystemProviderCapabilities.PathCaseSensitive;
          }
          return void 0;
        })
      ), "GetCapabilities");
      const ExtUriInstance = new ExtUri((Uri) => {
        const Capabilities = Effect.runSync(
          GetCapabilities(Uri.scheme)
        );
        const IgnoreCase = Capabilities ? !(Capabilities & FileSystemProviderCapabilities.PathCaseSensitive) : isWindows;
        Effect.runFork(
          Logger.Trace(
            `ExtURI check for scheme '${Uri.scheme}', ignoring case: ${IgnoreCase}`
          )
        );
        return IgnoreCase;
      });
      const AcceptProviderCapabilities = /* @__PURE__ */ __name((Scheme, Capabilities) => Effect.gen(function* () {
        if (Capabilities === null) {
          yield* Ref.update(
            CapabilitiesMapRef,
            HashMap.remove(Scheme)
          );
          yield* Logger.Trace(
            `Cleared capabilities for scheme '${Scheme}'.`
          );
        } else {
          yield* Ref.update(
            CapabilitiesMapRef,
            HashMap.set(Scheme, Capabilities)
          );
          yield* Logger.Trace(
            `Updated capabilities for scheme '${Scheme}' to: ${Capabilities}`
          );
        }
      }), "AcceptProviderCapabilities");
      IPC.RegisterInvokeHandler(
        "$acceptProviderInfos",
        ([Scheme, Capabilities]) => Effect.runPromise(
          AcceptProviderCapabilities(Scheme, Capabilities)
        )
      );
      IPC.RegisterInvokeHandler(
        "$onFileEvent",
        ([Events]) => Effect.runPromise(
          FireFileChangeEvent(
            Events.map((Event) => ({
              type: Event.type,
              uri: ToAPI(Event.uri)
            }))
          )
        )
      );
      return {
        ExtURI: ExtUriInstance,
        GetCapabilities,
        onDidChangeFile: OnDidChangeFileEvent,
        IsWritableFileSystem: /* @__PURE__ */ __name((Scheme) => {
          const Capabilities = Effect.runSync(
            GetCapabilities(Scheme)
          );
          return Capabilities ? !(Capabilities & FileSystemProviderCapabilities.Readonly) : true;
        }, "IsWritableFileSystem")
      };
    })
  }
) {
  static {
    __name(this, "FileSystemInformationService");
  }
}
export {
  FileSystemInformationService
};
//# sourceMappingURL=FileSystemInformation.js.map
