var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
class DiagnosticCollectionImplementation {
  // For internal use
  constructor(name, owner, ipc) {
    this.name = name;
    this.owner = owner;
    this.ipc = ipc;
  }
  static {
    __name(this, "DiagnosticCollectionImplementation");
  }
  isDisposed = false;
  onDidDispose = CreateEventStream();
  createSetEffect(uri, diagnostics) {
    if (this.isDisposed) {
      return Effect.unit;
    }
    const DiagnosticsDTO = diagnostics ? TypeConverter.Diagnostic.FromAPIArray(diagnostics) : void 0;
    const UriDTO = TypeConverter.URIConverter.FromAPI(uri);
    return this.ipc.SendNotification("$changeMany", [
      this.owner,
      [[UriDTO, DiagnosticsDTO]]
    ]);
  }
  set(uriOrEntries, diagnostics) {
    if (this.isDisposed) {
      return;
    }
    if (Array.isArray(uriOrEntries)) {
      const convertedEntries = uriOrEntries.map(([uri, diags]) => [
        TypeConverter.URIConverter.FromAPI(uri),
        diags ? TypeConverter.Diagnostic.FromAPIArray(diags) : void 0
      ]);
      Effect.runFork(
        this.ipc.SendNotification("$changeMany", [
          this.owner,
          convertedEntries
        ])
      );
    } else {
      Effect.runFork(this.createSetEffect(uriOrEntries, diagnostics));
    }
  }
  delete(uri) {
    this.set(uri, void 0);
  }
  clear() {
    if (this.isDisposed) {
      return;
    }
    Effect.runFork(this.ipc.SendNotification("$clear", [this.owner]));
  }
  dispose() {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    this.clear();
    this.onDidDispose.Fire();
  }
  // The following methods are not typically implemented on the ext host side,
  // as the source of truth for diagnostics lives in the main/host process.
  // They could be implemented with RPC calls if needed.
  forEach(callback, thisArg) {
  }
  get(uri) {
    return void 0;
  }
  has(uri) {
    return false;
  }
}
export {
  DiagnosticCollectionImplementation
};
//# sourceMappingURL=DiagnosticCollectionImplementation.js.map
