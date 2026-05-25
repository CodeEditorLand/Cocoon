var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/TypeConverter/Webview/Convert/Content/Option/To/DTO.ts
var ConvertContentOptionToDTO = /* @__PURE__ */ __name((ExtensionDescription, Options) => {
  return {
    enableCommandUris: Options.enableCommandUris,
    enableScripts: Options.enableScripts,
    enableForms: Options.enableForms,
    localResourceRoots: Options.localResourceRoots ?? [
      ExtensionDescription.extensionLocation
    ],
    portMapping: Options.portMapping
  };
}, "ConvertContentOptionToDTO");

// Source/Utility/Event/Stream.ts
import {
  Emitter
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/event.js";
import { Effect, PubSub } from "effect";
var CreateEventStream = /* @__PURE__ */ __name(() => {
  const VSCodeEmitter = new Emitter();
  const PubSubInstance = Effect.runSync(PubSub.unbounded());
  const Fire = /* @__PURE__ */ __name((Data) => PubSub.publish(PubSubInstance, Data).pipe(
    Effect.andThen(Effect.sync(() => VSCodeEmitter.fire(Data))),
    Effect.asVoid
  ), "Fire");
  const Shutdown = /* @__PURE__ */ __name(() => Effect.all([
    PubSub.shutdown(PubSubInstance),
    Effect.sync(() => VSCodeEmitter.dispose())
  ]).pipe(Effect.asVoid), "Shutdown");
  return {
    Fire,
    PubSub: PubSubInstance,
    event: VSCodeEmitter.event,
    Shutdown
  };
}, "CreateEventStream");

// Source/WebviewPanel/Webview/Implementation.ts
import { Schemas } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/network.js";
import { Effect as Effect2 } from "effect";
var WebviewImplementation = class {
  constructor(Handle, IPCService, Extension, InitialOptions) {
    this.Handle = Handle;
    this.IPCService = IPCService;
    this.Extension = Extension;
    this._options = InitialOptions;
    this.onDidReceiveMessage = this.OnDidReceiveMessageEmitter.event;
  }
  Handle;
  IPCService;
  Extension;
  static {
    __name(this, "WebviewImplementation");
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
    Effect2.runFork(UpdateEffect);
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
    Effect2.runFork(UpdateEffect);
  }
  get cspSource() {
    return "vscode-file: vscode-resource: vscode-webview-resource: https: *";
  }
  postMessage(Message) {
    if (this.IsDisposed) return Promise.resolve(false);
    const PostEffect = this.IPCService.SendRequest(
      "$postMessageToWebview",
      [this.Handle, Message]
    ).pipe(Effect2.catchAll(() => Effect2.succeed(false)));
    return Effect2.runPromise(PostEffect);
  }
  asWebviewUri(LocalResource) {
    const Authority = this.Extension.identifier.value.toLowerCase();
    return LocalResource.with({
      scheme: Schemas.vscodeFileResource,
      authority: Authority
    });
  }
  fireDidReceiveMessage(Message) {
    if (!this.IsDisposed) {
      Effect2.runFork(this.OnDidReceiveMessageEmitter.Fire(Message));
    }
  }
  dispose() {
    if (!this.IsDisposed) {
      this.IsDisposed = true;
      this.OnDidReceiveMessageEmitter.Shutdown();
    }
  }
};
export {
  WebviewImplementation
};
//# sourceMappingURL=Implementation.js.map
