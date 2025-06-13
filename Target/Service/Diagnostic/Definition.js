var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Stream } from "effect";
import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC } from "../IPC.js";
import { DiagnosticCollectionImplementation } from "./DiagnosticCollectionImplementation.js";
let OwnerCounter = 0;
const Definition = Effect.gen(function* (_) {
  const IPCService = yield* _(IPC.Tag);
  const OnDidChangeDiagnosticsEvent = CreateEventStream();
  IPCService.RegisterInvokeHandler(
    "$acceptMarkerData",
    ([uriComponentsArray]) => {
      const revivedUris = uriComponentsArray.map(
        (dto) => TypeConverter.URIConverter.ToAPI(dto)
      );
      return OnDidChangeDiagnosticsEvent.Fire(revivedUris).pipe(
        Effect.runPromise
      );
    }
  );
  const ServiceImplementation = {
    onDidChangeDiagnostics: OnDidChangeDiagnosticsEvent.Stream.pipe(
      Stream.toEvent
    ),
    CreateDiagnosticCollection: /* @__PURE__ */ __name((Name) => {
      const Owner = `cocoon-diag-${OwnerCounter++}-${Name ?? "anon"}`;
      return new DiagnosticCollectionImplementation(
        Name,
        Owner,
        IPCService
      );
    }, "CreateDiagnosticCollection")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
