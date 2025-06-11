var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Stream } from "effect";
import * as TypeConverter from "../../TypeConverter/mod.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
class WebviewImpl {
  constructor(Handle, IpcService, Extension, InitialOptions) {
    this.Handle = Handle;
    this.IpcService = IpcService;
    this.Extension = Extension;
    this._Options = InitialOptions;
  }
  static {
    __name(this, "WebviewImpl");
  }
  // --- Private State ---
  IsDisposed = false;
  _Html = "";
  _Options;
  // --- Event Emitters ---
  OnDidReceiveMessageEvent = CreateEventStream();
  onDidReceiveMessage = this.OnDidReceiveMessageEvent.Stream.pipe(Stream.toEvent);
  // --- Public API Properties ---
  get html() {
    return this._Html;
  }
  set html(value) {
    if (this.IsDisposed || this._Html === value) {
      return;
    }
    this._Html = value;
    const updateEffect = this.IpcService.SendNotification(
      "$setWebviewHtml",
      [this.Handle, value]
    );
    Effect.runFork(updateEffect);
  }
  get options() {
    return this._Options;
  }
  set options(newOptions) {
    if (this.IsDisposed) {
      return;
    }
    this._Options = newOptions;
    const OptionsDto = TypeConverter.Webview.ConvertContentOptionsToDto(
      this.Extension,
      newOptions
    );
    const updateEffect = this.IpcService.SendNotification(
      "$setWebviewOptions",
      [this.Handle, OptionsDto]
    );
    Effect.runFork(updateEffect);
  }
  get cspSource() {
    return "vscode-resource: vscode-webview-resource: https:";
  }
  // --- Public API Methods ---
  postMessage(message) {
    if (this.IsDisposed) {
      return Promise.resolve(false);
    }
    const postEffect = this.IpcService.SendRequest(
      "$postMessageToWebview",
      [this.Handle, message]
    ).pipe(
      Effect.catchAll(() => Effect.succeed(false))
      // Return false on any failure
    );
    return Effect.runPromise(postEffect);
  }
  asWebviewUri(localResource) {
    return localResource.with({
      scheme: `vscode-resource`,
      authority: localResource.scheme,
      path: localResource.path
    });
  }
  // --- Internal Methods (called by other services) ---
  /**
   * Called by the WebviewPanel service when a message is received from the host
   * for this specific webview instance.
   */
  FireDidReceiveMessage(message) {
    if (!this.IsDisposed) {
      this.OnDidReceiveMessageEvent.Fire(message);
    }
  }
  /**
   * Marks this webview as disposed and cleans up its resources.
   */
  Dispose() {
    if (!this.IsDisposed) {
      this.IsDisposed = true;
    }
  }
}
export {
  WebviewImpl
};
//# sourceMappingURL=WebviewImpl.js.map
