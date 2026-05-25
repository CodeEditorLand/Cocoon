var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));

// Source/TypeConverter/Main/View/Column.ts
var { ViewColumn: VSCodeViewColumn } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js");
var ActiveEditorGroup = -1;
var SideGroup = -2;
var FromAPI = /* @__PURE__ */ __name((ViewColumn) => {
  if (typeof ViewColumn !== "number") {
    return void 0;
  }
  switch (ViewColumn) {
    case VSCodeViewColumn.Active:
      return ActiveEditorGroup;
    case VSCodeViewColumn.Beside:
      return SideGroup;
    default:
      if (ViewColumn >= VSCodeViewColumn.One) {
        return ViewColumn - 1;
      }
  }
  return void 0;
}, "FromAPI");

// Source/Platform/VSCode/Type.ts
var Type_exports = {};
__export(Type_exports, {
  CancellationToken: () => CancellationToken,
  CancellationTokenSource: () => CancellationTokenSource,
  URI: () => URI
});
__reExport(Type_exports, extHostTypes_star);
import * as extHostTypes_star from "@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js";
import { URI } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js";
import {
  CancellationToken,
  CancellationTokenSource
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/cancellation.js";

// Source/TypeConverter/Main/URI.ts
var FromAPI2 = /* @__PURE__ */ __name((TheURI) => TheURI.toJSON(), "FromAPI");
var ToAPI = /* @__PURE__ */ __name((DTO) => URI.revive(DTO), "ToAPI");

// Source/TypeConverter/Webview/Convert/Show/Option/To/DTO.ts
var ConvertShowOptionToDTO = /* @__PURE__ */ __name((ViewColumn, PreserveFocus) => {
  const DTO = {
    preserveFocus: PreserveFocus
  };
  const ViewColumnValue = FromAPI(ViewColumn);
  if (ViewColumnValue !== void 0) {
    DTO.viewColumn = ViewColumnValue;
  }
  return DTO;
}, "ConvertShowOptionToDTO");

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

// Source/WebviewPanel/Webview/Panel/Implementation.ts
import { Effect as Effect3 } from "effect";
var WebviewPanelImplementation = class {
  constructor(Handle, IPC, Extension, OnDidDisposeCallback, InitialViewType, InitialTitle, InitialOptions, InitialViewColumn) {
    this.Handle = Handle;
    this.IPC = IPC;
    this.OnDidDisposeCallback = OnDidDisposeCallback;
    this.viewType = InitialViewType;
    this.options = InitialOptions;
    this.webview = new WebviewImplementation(
      Handle,
      IPC,
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
  Handle;
  IPC;
  OnDidDisposeCallback;
  static {
    __name(this, "WebviewPanelImplementation");
  }
  IsDisposed = false;
  _title;
  // FIX: The error indicates the interface expects a non-optional property.
  // We will manage an internal `undefined` state but the public property will conform.
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
      this.IPC.SendNotification("$setWebviewTitle", [this.Handle, Value])
    );
  }
  // FIX: The public property must conform to the interface, even if the
  // internal state can be undefined. We will cast this in the getter/setter.
  get iconPath() {
    return this._iconPath;
  }
  set iconPath(Value) {
    const internalValue = Value;
    if (this.IsDisposed || this._iconPath === internalValue) return;
    this._iconPath = internalValue;
    const IconPathDTO = internalValue ? "light" in internalValue && "dark" in internalValue ? {
      light: FromAPI2(internalValue.light),
      dark: FromAPI2(internalValue.dark)
    } : {
      light: FromAPI2(internalValue),
      dark: FromAPI2(internalValue)
    } : void 0;
    Effect3.runFork(
      this.IPC.SendNotification("$setWebviewIconPath", [
        this.Handle,
        IconPathDTO
      ])
    );
  }
  reveal(ViewColumn, PreserveFocus) {
    if (this.IsDisposed) return;
    const ViewColumnDTO = ViewColumn ? ConvertShowOptionToDTO(ViewColumn, PreserveFocus ?? false) : void 0;
    Effect3.runFork(
      this.IPC.SendNotification("$revealWebviewPanel", [
        this.Handle,
        ViewColumnDTO,
        PreserveFocus
      ])
    );
  }
  dispose() {
    if (this.IsDisposed) {
      return;
    }
    this.IsDisposed = true;
    this.OnDidDisposeEmitter.Fire();
    this.OnDidDisposeCallback();
    this.webview.dispose();
    Effect3.runFork(
      this.IPC.SendNotification("$disposeWebview", [this.Handle])
    );
  }
  fireDidReceiveMessage(Message) {
    this.webview.fireDidReceiveMessage(Message);
  }
  updateViewState(NewState) {
    if (this.IsDisposed) return;
    const Changed = this._active !== NewState.active || this._visible !== NewState.visible || this._viewColumn !== NewState.viewColumn;
    this._active = NewState.active;
    this._visible = NewState.visible;
    this._viewColumn = NewState.viewColumn;
    if (Changed) {
      this.OnDidChangeViewStateEmitter.Fire({
        webviewPanel: this
      });
    }
  }
};

// Source/Services/Window/Webview/Panel.ts
import { Effect as Effect4 } from "effect";
var CreateWebviewPanel = /* @__PURE__ */ __name((MountainClient, GRPCClient, Logger, ViewType, Title, ShowOptions, Options) => Effect4.gen(function* () {
  const PanelId = `webview-${crypto.randomUUID()}`;
  yield* Logger.Info(
    `[WindowService] Creating webview panel: ${ViewType} - ${Title} (${PanelId})`
  );
  const ViewColumn = typeof ShowOptions === "number" ? ShowOptions : ShowOptions.viewColumn;
  const PreserveFocus = typeof ShowOptions === "object" ? ShowOptions.preserveFocus ?? false : false;
  const PanelOptionsDTO = Options ? {
    enableFindWidget: Options.enableFindWidget,
    enableScripts: Options.enableScripts,
    enableForms: Options.enableForms,
    enableCommandUris: Options.enableCommandUris,
    portMapping: Options.portMapping,
    localResourceRoots: Options.localResourceRoots,
    retainContextWhenHidden: Options.retainContextWhenHidden
  } : void 0;
  const ViewColumnDTO = FromAPI(ViewColumn);
  yield* GRPCClient.createWebviewPanel({
    viewType: ViewType,
    title: Title ?? "",
    iconPath: void 0,
    viewColumn: ViewColumn ? ViewColumn - 2 : void 0,
    preserveFocus: PreserveFocus ?? true,
    enableFindWidget: Options?.enableFindWidget ?? true,
    retainContextWhenHidden: Options?.retainContextWhenHidden ?? false,
    localResourceRoots: Options?.localResourceRoots?.map(
      (Uri) => Uri.toString()
    )
  });
  const IPCProxy = {
    SendNotification: /* @__PURE__ */ __name((Method, Params) => Effect4.gen(function* () {
      yield* Logger.Debug(
        `[WindowService] Webview notification: ${Method}`
      );
      MountainClient.sendNotification("webview.postMessage", {
        panelId: PanelId,
        method: Method,
        params: Params
      }).catch(() => {
      });
    }), "SendNotification"),
    SendRequest: /* @__PURE__ */ __name((_Method, _Params) => Effect4.gen(function* () {
      return void 0;
    }), "SendRequest")
  };
  const ExtensionDescription = {
    identifier: { value: "extension-placeholder" },
    extensionLocation: { scheme: "file", path: "/tmp/extension" }
  };
  const WebviewPanel = new WebviewPanelImplementation(
    PanelId,
    IPCProxy,
    ExtensionDescription,
    () => {
      MountainClient.sendNotification("webview.dispose", {
        panelId: PanelId
      }).catch(() => {
      });
    },
    ViewType,
    Title,
    PanelOptionsDTO ?? {},
    ViewColumn
  );
  return yield* Effect4.succeed(WebviewPanel);
}), "CreateWebviewPanel");
export {
  CreateWebviewPanel
};
//# sourceMappingURL=Panel.js.map
