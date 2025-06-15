var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Stream } from "effect";
import { WebView as TypeConverter } from "../../TypeConverter.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import WebViewImplementation from "../WebView/WebViewImplementation.js";
class WebViewPanelImplementation_default {
  constructor(Handle, IPCService, Extension, OnDidDisposeCallback, InitialViewType, InitialTitle, InitialOptions, InitialViewColumn) {
    this.Handle = Handle;
    this.IPCService = IPCService;
    this.Extension = Extension;
    this.OnDidDisposeCallback = OnDidDisposeCallback;
    this.viewType = InitialViewType;
    this.options = InitialOptions;
    this.webview = new WebViewImplementation(
      Handle,
      IPCService,
      Extension,
      InitialOptions
    );
    this._title = InitialTitle;
    this._viewColumn = InitialViewColumn;
    this._active = true;
    this._visible = true;
    this.onDidDispose = Stream.toEvent(this.OnDidDisposeEmitter.Stream);
    this.onDidChangeViewState = Stream.toEvent(
      this.OnDidChangeViewStateEmitter.Stream
    );
  }
  static {
    __name(this, "default");
  }
  IsDisposed = false;
  _title;
  _iconPath;
  _active;
  _visible;
  _viewColumn;
  // --- Events ---
  OnDidDisposeEmitter = CreateEventStream();
  onDidDispose;
  OnDidChangeViewStateEmitter = CreateEventStream();
  onDidChangeViewState;
  webview;
  viewType;
  options;
  // --- Properties with RPC side-effects ---
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
    if (this.IsDisposed || this._title === Value) {
      return;
    }
    this._title = Value;
    Effect.runFork(
      this.IPCService.SendNotification("$setWebviewTitle", [
        this.Handle,
        Value
      ])
    );
  }
  get iconPath() {
    return this._iconPath;
  }
  set iconPath(Value) {
    if (this.IsDisposed || this._iconPath === Value) {
      return;
    }
    this._iconPath = Value;
    const IconPathDTO = Value ? {
      light: Value.light ? TypeConverter.ConvertExtensionDataToDTO(
        Value.light
      ) : void 0,
      dark: Value.dark ? TypeConverter.ConvertExtensionDataToDTO(
        Value.dark
      ) : TypeConverter.ConvertExtensionDataToDTO(Value)
    } : void 0;
    Effect.runFork(
      this.IPCService.SendNotification("$setWebviewIconPath", [
        this.Handle,
        IconPathDTO
      ])
    );
  }
  // --- Public Methods ---
  reveal(ViewColumn, PreserveFocus) {
    if (this.IsDisposed) return;
    const ViewColumnDTO = ViewColumn ? TypeConverter.ConvertShowOptionToDTO(
      ViewColumn,
      PreserveFocus ?? false
    ) : void 0;
    this.IPCService.SendNotification("$revealWebviewPanel", [
      this.Handle,
      ViewColumnDTO,
      PreserveFocus
    ]);
  }
  dispose() {
    if (this.IsDisposed) {
      return;
    }
    this.IsDisposed = true;
    this.OnDidDisposeEmitter.Fire();
    this.OnDidDisposeCallback();
    this.webview.dispose();
    Effect.runFork(
      this.IPCService.SendNotification("$disposeWebview", [this.Handle])
    );
  }
  // --- Internal Methods ---
  _updateViewState(NewState) {
    if (this.IsDisposed) return;
    const Changed = this._active !== NewState.active || this._visible !== NewState.visible || this._viewColumn !== NewState.viewColumn;
    this._active = NewState.active;
    this._visible = NewState.visible;
    this._viewColumn = NewState.viewColumn;
    if (Changed) {
      this.OnDidChangeViewStateEmitter.Fire({ webviewPanel: this });
    }
  }
}
export {
  WebViewPanelImplementation_default as default
};
//# sourceMappingURL=WebViewPanelImplementation.js.map
