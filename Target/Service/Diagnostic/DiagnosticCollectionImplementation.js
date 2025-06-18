var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import DiagnosticConverter from "../../TypeConverter/Diagnostic.js";
import URIConverter from "../../TypeConverter/Main/URI.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
class DiagnosticCollectionImplementation_default {
  constructor(name, Owner, IPC) {
    this.name = name;
    this.Owner = Owner;
    this.IPC = IPC;
  }
  static {
    __name(this, "default");
  }
  IsDisposed = false;
  OnDidDisposeStream = CreateEventStream();
  CreateSetEffect(Uri, Diagnostics) {
    if (this.IsDisposed) {
      return Effect.void;
    }
    const DiagnosticsDTO = Diagnostics ? DiagnosticConverter.FromAPIArray(Diagnostics) : void 0;
    const UriDTO = URIConverter.FromAPI(Uri);
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
      const ConvertedEntries = uriOrEntries.map(([Uri, Diags]) => [
        URIConverter.FromAPI(Uri),
        Diags ? DiagnosticConverter.FromAPIArray(Diags) : void 0
      ]);
      Effect.runFork(
        this.IPC.SendNotification("$changeMany", [
          this.Owner,
          ConvertedEntries
        ])
      );
    } else {
      Effect.runFork(
        this.CreateSetEffect(uriOrEntries, diagnostics)
      );
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
    Effect.runFork(this.OnDidDisposeStream.Fire());
  }
  forEach() {
  }
  get(_uri) {
    return void 0;
  }
  has(_uri) {
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
