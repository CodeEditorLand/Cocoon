var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import * as TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import DiagnosticCollectionImplementation from "./DiagnosticCollectionImplementation.js";
let OwnerCounter = 0;
var Definition_default = Effect.gen(function* (_) {
  const IPC = yield* _(IPCService);
  const OnDidChangeDiagnosticsEvent = CreateEventStream();
  IPC.RegisterInvokeHandler("$acceptMarkerData", ([uriComponentsArray]) => {
    const RevivedUris = uriComponentsArray.map(
      (DTO) => TypeConverter.URI.ToAPI(DTO)
    );
    return OnDidChangeDiagnosticsEvent.Fire(RevivedUris);
  });
  const ServiceImplementation = {
    onDidChangeDiagnostics: OnDidChangeDiagnosticsEvent.event,
    CreateDiagnosticCollection: /* @__PURE__ */ __name((Name) => {
      const Owner = `cocoon-diag-${OwnerCounter++}-${Name ?? "anon"}`;
      return new DiagnosticCollectionImplementation(Name, Owner, IPC);
    }, "CreateDiagnosticCollection")
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
