var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { FromAPI as UriFromAPI } from "../TypeConverter/Main/URI.js";
import { ConvertShowOptionToDTO } from "../TypeConverter/WebView/ConvertShowOptionToDTO.js";
import { CreateEventStream } from "../Utility/CreateEventStream.js";
import { WebViewImplementation } from "./WebViewImplementation.js";
class WebViewPanelImplementation {
  constructor(Handle, IPC, Extension, OnDidDisposeCallback, InitialViewType, InitialTitle, InitialOptions, InitialViewColumn) {
    this.Handle = Handle;
    this.IPC = IPC;
    this.OnDidDisposeCallback = OnDidDisposeCallback;
    this.viewType = InitialViewType;
    this.options = InitialOptions;
    this.webview = new WebViewImplementation(
      Handle,
      IPC,
      Extension,
      InitialOptions
    );
    this._title = InitialTitle;
    this._viewColumn = InitialViewColumn;
    this._active = true;
    this._visible = true;
    this.onDidDispose = this.OnDidDisposeEmitter.event;
    this.onDidChangeViewState = this.OnDidChangeViewStateEmitter.event;
  }
  static {
    __name(this, "WebViewPanelImplementation");
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
    Effect.runFork(
      this.IPC.SendNotification("$setWebviewTitle", [this.Handle, Value])
    );
  }
  get iconPath() {
    return this._iconPath;
  }
  set iconPath(Value) {
    if (this.IsDisposed || this._iconPath === Value) return;
    this._iconPath = Value;
    const IconPathDTO = Value ? {
      light: UriFromAPI("light" in Value ? Value.light : Value),
      dark: UriFromAPI("dark" in Value ? Value.dark : Value)
    } : void 0;
    Effect.runFork(
      this.IPC.SendNotification("$setWebviewIconPath", [
        this.Handle,
        IconPathDTO
      ])
    );
  }
  reveal(ViewColumn, PreserveFocus) {
    if (this.IsDisposed) return;
    const ViewColumnDTO = ViewColumn ? ConvertShowOptionToDTO(ViewColumn, PreserveFocus ?? false) : void 0;
    Effect.runFork(
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
    Effect.runFork(
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
      this.OnDidChangeViewStateEmitter.Fire({ webviewPanel: this });
    }
  }
}
export {
  WebViewPanelImplementation
};
//# sourceMappingURL=WebViewPanelImplementation.js.map
