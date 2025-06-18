var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import URIConverter from "Source/TypeConverter/Main/URI.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import DiagnosticCollectionImplementation from "./DiagnosticCollectionImplementation.js";
let OwnerCounter = 0;
var Definition_default = Effect.gen(function* () {
  const IPC = yield* IPCService;
  const { event, Fire } = CreateEventStream();
  yield* Effect.sync(
    () => IPC.RegisterInvokeHandler(
      "$acceptMarkerData",
      ([uriComponentsArray]) => {
        const RevivedUris = uriComponentsArray.map(
          (DTO) => URIConverter.ToAPI(DTO)
        );
        return Effect.runPromise(Fire(RevivedUris));
      }
    )
  );
  const ServiceImplementation = {
    onDidChangeDiagnostics: event,
    CreateDiagnosticCollection: /* @__PURE__ */ __name((Name) => {
      const Owner = `cocoon-diag-${OwnerCounter++}-${Name ?? "anon"}`;
      return new DiagnosticCollectionImplementation(
        Name ?? "",
        Owner,
        IPC
      );
    }, "CreateDiagnosticCollection")
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
