var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

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

// Source/WebviewPanel/Panel.ts
import { Effect as Effect3 } from "effect";
var Panel = class _Panel {
  constructor(FactoryHandle, IPCSvc, Extension, InitialViewType, InitialTitle, InitialOptions, InitialViewColumn) {
    this.FactoryHandle = FactoryHandle;
    this.handle = this.FactoryHandle;
    this.ipcService = IPCSvc;
    this.extension = Extension;
    this.viewType = InitialViewType;
    this.options = InitialOptions;
    this.webview = new WebviewImplementation(
      this.handle,
      IPCSvc,
      Extension,
      InitialOptions
    );
    this._title = InitialTitle;
    this._viewColumn = InitialViewColumn;
    this._active = true;
    this._visible = true;
    this._iconPath = void 0;
    this.onDidDispose = this.OnDidDisposeEmitter.event;
    this.onDidChangeViewState = this.OnDidChangeViewStateEmitter.event;
  }
  FactoryHandle;
  static {
    __name(this, "Panel");
  }
  IsDisposed = false;
  _title;
  _iconPath;
  _active;
  _visible;
  _viewColumn;
  OnDidDisposeEmitter = CreateEventStream();
  onDidDispose;
  OnDidChangeViewStateEmitter = CreateEventStream();
  onDidChangeViewState;
  webview;
  viewType;
  options;
  handle;
  ipcService;
  extension;
  /**
   * Create a new Panel instance
   */
  static Create(Options) {
    return Effect3.sync(() => {
      const ViewColumnValue = Options.ShowOptions.ViewColumn ?? 1;
      const mockIPC = {
        SendNotification: /* @__PURE__ */ __name((channel, params) => Effect3.void, "SendNotification")
      };
      const PanelInstance = new _Panel(
        Options.Handle,
        mockIPC,
        Options.Extension,
        Options.ViewType,
        Options.Title,
        Options.Options ?? {},
        ViewColumnValue
      );
      return PanelInstance;
    });
  }
  // VSCode WebviewPanel interface properties
  get viewColumn() {
    return this._viewColumn;
  }
  get active() {
    return this._active;
  }
  get visible() {
    return this._visible;
  }
  get title() {
    return this._title;
  }
  set title(Value) {
    if (this.IsDisposed || this._title === Value) return;
    this._title = Value;
    Effect3.runFork(
      this.ipcService.SendNotification("$setWebviewTitle", [
        this.handle,
        Value
      ])
    );
  }
  get iconPath() {
    return this._iconPath;
  }
  set iconPath(Value) {
    const InternalValue = Value;
    if (this.IsDisposed || this._iconPath === InternalValue) return;
    this._iconPath = InternalValue;
    Effect3.runFork(
      this.ipcService.SendNotification("$setWebviewIconPath", [
        this.handle,
        InternalValue
      ])
    );
  }
  /**
   * Reveal the panel in the editor
   */
  reveal(ViewColumnParam, PreserveFocus) {
    if (this.IsDisposed) return;
    Effect3.runFork(
      this.ipcService.SendNotification("$revealWebviewPanel", [
        this.handle,
        ViewColumnParam,
        PreserveFocus
      ])
    );
  }
  /**
   * Dispose the panel and cleanup resources
   */
  dispose() {
    if (this.IsDisposed) {
      return;
    }
    this.IsDisposed = true;
    this.OnDidDisposeEmitter.Fire();
    this.webview.dispose();
    Effect3.runFork(
      this.ipcService.SendNotification("$disposeWebview", [this.handle])
    );
  }
  /**
   * Fire a message received event from the Webview
   */
  FireDidReceiveMessage(Message) {
    if (!this.IsDisposed) {
      this.webview.fireDidReceiveMessage(
        Message
      );
    }
  }
  /**
   * Update the view state of the panel
   */
  UpdateViewState(NewState) {
    if (this.IsDisposed) return;
    const Changed = this._active !== NewState.Active || this._visible !== NewState.Visible || this._viewColumn !== NewState.ViewColumn;
    this._active = NewState.Active;
    this._visible = NewState.Visible;
    this._viewColumn = NewState.ViewColumn;
    if (Changed) {
      this.OnDidChangeViewStateEmitter.Fire({
        webviewPanel: this
      });
    }
  }
};
export {
  Panel
};
//# sourceMappingURL=Panel.js.map
