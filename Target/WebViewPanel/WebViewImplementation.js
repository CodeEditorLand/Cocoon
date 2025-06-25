var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { Schemas } from "vs/base/common/network.js";
import { ConvertContentOptionToDTO } from "../TypeConverter/WebView/ConvertContentOptionToDTO.js";
import { CreateEventStream } from "../Utility/CreateEventStream.js";
class WebViewImplementation {
  constructor(Handle, IPCService, Extension, InitialOptions) {
    this.Handle = Handle;
    this.IPCService = IPCService;
    this.Extension = Extension;
    this._options = InitialOptions;
    this.onDidReceiveMessage = this.OnDidReceiveMessageEmitter.event;
  }
  static {
    __name(this, "WebViewImplementation");
  }
  IsDisposed = false;
  _html = "";
  _options;
  OnDidReceiveMessageEmitter = CreateEventStream();
  onDidReceiveMessage;
  get html() {
    return this._html;
  }
  set html(Value) {
    if (this.IsDisposed || this._html === Value) return;
    this._html = Value;
    const UpdateEffect = this.IPCService.SendNotification(
      "$setWebviewHtml",
      [this.Handle, Value]
    );
    Effect.runFork(UpdateEffect);
  }
  get options() {
    return this._options;
  }
  set options(NewOptions) {
    if (this.IsDisposed) return;
    this._options = NewOptions;
    const OptionsDTO = ConvertContentOptionToDTO(
      this.Extension,
      NewOptions
    );
    const UpdateEffect = this.IPCService.SendNotification(
      "$setWebviewOptions",
      [this.Handle, OptionsDTO]
    );
    Effect.runFork(UpdateEffect);
  }
  get cspSource() {
    return "vscode-resource: vscode-webview-resource: https:";
  }
  postMessage(Message) {
    if (this.IsDisposed) return Promise.resolve(false);
    const PostEffect = this.IPCService.SendRequest(
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
  fireDidReceiveMessage(Message) {
    if (!this.IsDisposed) {
      Effect.runFork(this.OnDidReceiveMessageEmitter.Fire(Message));
    }
  }
  dispose() {
    if (!this.IsDisposed) {
      this.IsDisposed = true;
      this.OnDidReceiveMessageEmitter.Shutdown();
    }
  }
}
export {
  WebViewImplementation
};
//# sourceMappingURL=WebViewImplementation.js.map
