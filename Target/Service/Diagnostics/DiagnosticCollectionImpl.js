var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import * as TypeConverter from "../../TypeConverter/mod.js";
class DiagnosticCollectionImpl {
  constructor(name, ownerId, ipc) {
    this.name = name;
    this.ownerId = ownerId;
    this.ipc = ipc;
  }
  static {
    __name(this, "DiagnosticCollectionImpl");
  }
  _isDisposed = false;
  createSetEffect(uri, diagnostics) {
    if (this._isDisposed) return Effect.unit;
    const Dto = diagnostics ? TypeConverter.Diagnostic.fromApiArray(diagnostics) : void 0;
    const UriDto = TypeConverter.Uri.fromApi(uri);
    return this.ipc.SendNotification("$changeMany", [
      this.ownerId,
      [[UriDto, Dto]]
    ]);
  }
  set(uriOrEntries, diagnostics) {
    if (Array.isArray(uriOrEntries)) {
      const effects = uriOrEntries.map(
        ([uri, diags]) => this.createSetEffect(uri, diags)
      );
      Effect.runFork(
        Effect.all(effects, {
          discard: true,
          concurrency: "unbounded"
        })
      );
    } else {
      Effect.runFork(this.createSetEffect(uriOrEntries, diagnostics));
    }
  }
  delete(uri) {
    this.set(uri, void 0);
  }
  clear() {
    if (this._isDisposed) return;
    Effect.runFork(this.ipc.SendNotification("$clear", [this.ownerId]));
  }
  dispose() {
    this.clear();
    this._isDisposed = true;
  }
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
  DiagnosticCollectionImpl
};
//# sourceMappingURL=DiagnosticCollectionImpl.js.map
