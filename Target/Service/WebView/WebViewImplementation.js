var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Stream } from "effect";
import { Schemas } from "vs/base/common/network.js";
import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
class WebViewImplementation {
  constructor(handle, ipcService, extension, initialOptions) {
    this.handle = handle;
    this.ipcService = ipcService;
    this.extension = extension;
    this._options = initialOptions;
  }
  static {
    __name(this, "WebViewImplementation");
  }
  // --- Private State ---
  _isDisposed = false;
  _html = "";
  _options;
  // --- Event Emitters ---
  onDidReceiveMessageEmitter = CreateEventStream();
  onDidReceiveMessage = this.onDidReceiveMessageEmitter.Stream.pipe(Stream.toEvent);
  // --- Public API Properties ---
  get html() {
    return this._html;
  }
  set html(value) {
    if (this._isDisposed || this._html === value) {
      return;
    }
    this._html = value;
    const updateEffect = this.ipcService.SendNotification(
      "$setWebviewHtml",
      [this.handle, value]
    );
    Effect.runFork(updateEffect);
  }
  get options() {
    return this._options;
  }
  set options(newOptions) {
    if (this._isDisposed) {
      return;
    }
    this._options = newOptions;
    const OptionsDTO = TypeConverter.WebView.ConvertContentOptionToDTO(
      this.extension,
      newOptions
    );
    const updateEffect = this.ipcService.SendNotification(
      "$setWebviewOptions",
      [this.handle, OptionsDTO]
    );
    Effect.runFork(updateEffect);
  }
  get cspSource() {
    return "vscode-resource: vscode-webview-resource: https:";
  }
  // --- Public API Methods ---
  postMessage(message) {
    if (this._isDisposed) {
      return Promise.resolve(false);
    }
    const postEffect = this.ipcService.SendRequest("$postMessageToWebview", [
      this.handle,
      message
    ]).pipe(
      Effect.catchAll(() => Effect.succeed(false))
      // Return false on any failure
    );
    return Effect.runPromise(postEffect);
  }
  asWebviewUri(localResource) {
    const authority = this.extension.identifier.value.toLowerCase();
    return localResource.with({
      scheme: Schemas.vscodeWebviewResource,
      authority
    });
  }
  // --- Internal Methods (called by other services) ---
  /**
   * Called by the WebViewPanel service when a message is received from the host
   * for this specific webview instance.
   */
  fireDidReceiveMessage(message) {
    if (!this._isDisposed) {
      this.onDidReceiveMessageEmitter.Fire(message);
    }
  }
  /**
   * Marks this webview as disposed and cleans up its resources.
   */
  dispose() {
    if (!this._isDisposed) {
      this._isDisposed = true;
      this.onDidReceiveMessageEmitter.Shutdown();
    }
  }
}
export {
  WebViewImplementation
};
//# sourceMappingURL=WebViewImplementation.js.map
