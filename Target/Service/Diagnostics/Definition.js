var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IpcProvider } from "../Ipc/mod.js";
import { DiagnosticCollectionImpl } from "./DiagnosticCollectionImpl.js";
let OwnerCounter = 0;
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const OnDidChangeEvent = CreateEventStream();
  Ipc.RegisterInvokeHandler("$acceptMarkerData", ([uris]) => {
    const revivedUris = uris.map(
      (dto) => TypeConverter.Uri.toApi(dto)
    );
    return OnDidChangeEvent.Fire(revivedUris).pipe(Effect.runPromise);
  });
  const ServiceImplementation = {
    onDidChangeDiagnostics: OnDidChangeEvent.Stream.pipe(Stream.toEvent),
    CreateDiagnosticCollection: /* @__PURE__ */ __name((Name) => {
      const OwnerId = `cocoon-diag-${OwnerCounter++}-${Name ?? "anon"}`;
      return new DiagnosticCollectionImpl(Name, OwnerId, Ipc);
    }, "CreateDiagnosticCollection")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
