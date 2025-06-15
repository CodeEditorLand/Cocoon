var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import * as DiagnosticConverter from "../../TypeConverter/Diagnostic.js";
import * as TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
class DiagnosticCollectionImplementation_default {
  // For internal use
  constructor(name, Owner, IPC) {
    this.name = name;
    this.Owner = Owner;
    this.IPC = IPC;
  }
  static {
    __name(this, "default");
  }
  IsDisposed = false;
  OnDidDispose = CreateEventStream();
  CreateSetEffect(uri, diagnostics) {
    if (this.IsDisposed) {
      return Effect.void;
    }
    const DiagnosticsDTO = diagnostics ? DiagnosticConverter.FromAPIArray(diagnostics) : void 0;
    const UriDTO = TypeConverter.URI.FromAPI(uri);
    return this.IPC.SendNotification("$changeMany", [
      this.Owner,
      [[UriDTO, DiagnosticsDTO]]
    ]);
  }
  set(uriOrEntries, diagnostics) {
    if (this.IsDisposed) {
      return;
    }
    if (Array.isArray(uriOrEntries)) {
      const ConvertedEntries = uriOrEntries.map(([uri, diags]) => [
        TypeConverter.URI.FromAPI(uri),
        diags ? DiagnosticConverter.FromAPIArray(diags) : void 0
      ]);
      Effect.runFork(
        this.IPC.SendNotification("$changeMany", [
          this.Owner,
          ConvertedEntries
        ])
      );
    } else {
      Effect.runFork(this.CreateSetEffect(uriOrEntries, diagnostics));
    }
  }
  delete(uri) {
    this.set(uri, void 0);
  }
  clear() {
    if (this.IsDisposed) {
      return;
    }
    Effect.runFork(this.IPC.SendNotification("$clear", [this.Owner]));
  }
  dispose() {
    if (this.IsDisposed) {
      return;
    }
    this.IsDisposed = true;
    this.clear();
    this.OnDidDispose.Fire();
  }
  forEach() {
  }
  get(uri) {
    return void 0;
  }
  has(uri) {
    return false;
  }
  [Symbol.iterator]() {
    return [][Symbol.iterator]();
  }
}
export {
  DiagnosticCollectionImplementation_default as default
};
//# sourceMappingURL=DiagnosticCollectionImplementation.js.map
