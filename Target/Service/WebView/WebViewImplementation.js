var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { Schemas } from "vs/base/common/network.js";
import ConvertContentOptionToDTO from "../../TypeConverter/WebView/ConvertContentOptionToDTO.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
class WebViewImplementation_default {
  constructor(Handle, IPC, Extension, InitialOptions) {
    this.Handle = Handle;
    this.IPC = IPC;
    this.Extension = Extension;
    this._options = InitialOptions;
    this.onDidReceiveMessage = this.OnDidReceiveMessageEmitter.event;
  }
  static {
    __name(this, "default");
  }
  // --- Private State ---
  IsDisposed = false;
  _html = "";
  _options;
  // --- Event Emitters ---
  OnDidReceiveMessageEmitter = CreateEventStream();
  onDidReceiveMessage;
  // --- Public API Properties ---
  get html() {
    return this._html;
  }
  set html(Value) {
    if (this.IsDisposed || this._html === Value) {
      return;
    }
    this._html = Value;
    const UpdateEffect = this.IPC.SendNotification("$setWebviewHtml", [
      this.Handle,
      Value
    ]);
    Effect.runFork(UpdateEffect);
  }
  get options() {
    return this._options;
  }
  set options(NewOptions) {
    if (this.IsDisposed) {
      return;
    }
    this._options = NewOptions;
    const OptionsDTO = ConvertContentOptionToDTO(
      this.Extension,
      NewOptions
    );
    const UpdateEffect = this.IPC.SendNotification("$setWebviewOptions", [
      this.Handle,
      OptionsDTO
    ]);
    Effect.runFork(UpdateEffect);
  }
  get cspSource() {
    return "vscode-resource: vscode-webview-resource: https:";
  }
  // --- Public API Methods ---
  postMessage(Message) {
    if (this.IsDisposed) {
      return Promise.resolve(false);
    }
    const PostEffect = this.IPC.SendRequest(
      "$postMessageToWebview",
      [this.Handle, Message]
    ).pipe(Effect.catchAll(() => Effect.succeed(false)));
    return Effect.runPromise(PostEffect);
  }
  asWebviewUri(LocalResource) {
    const Authority = this.Extension.identifier.value.toLowerCase();
    return LocalResource.with({
      scheme: Schemas["vscode-webview-resource"],
      authority: Authority
    });
  }
  // --- Internal Methods (called by other services) ---
  /**
   * Called by the WebViewPanel service when a message is received from the host
   * for this specific webview instance.
   */
  fireDidReceiveMessage(Message) {
    if (!this.IsDisposed) {
      Effect.runFork(this.OnDidReceiveMessageEmitter.Fire(Message));
    }
  }
  /**
   * Marks this webview as disposed and cleans up its resources.
   */
  dispose() {
    if (!this.IsDisposed) {
      this.IsDisposed = true;
      this.OnDidReceiveMessageEmitter.Shutdown();
    }
  }
}
export {
  WebViewImplementation_default as default
};
//# sourceMappingURL=WebViewImplementation.js.map
