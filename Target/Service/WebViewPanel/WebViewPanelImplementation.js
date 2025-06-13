var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Stream } from "effect";
import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { WebViewImplementation } from "../WebView/WebViewImplementation.js";
class WebViewPanelImplementation {
  constructor(handle, ipcService, extension, onDidDisposeCallback, initialViewType, initialTitle, initialOptions, initialViewColumn) {
    this.handle = handle;
    this.ipcService = ipcService;
    this.extension = extension;
    this.onDidDisposeCallback = onDidDisposeCallback;
    this.viewType = initialViewType;
    this.webview = new WebViewImplementation(
      handle,
      ipcService,
      extension,
      initialOptions
    );
    this._title = initialTitle;
    this._viewColumn = initialViewColumn;
    this._active = true;
    this._visible = true;
  }
  static {
    __name(this, "WebViewPanelImplementation");
  }
  _isDisposed = false;
  _title;
  _iconPath;
  _active;
  _visible;
  _viewColumn;
  // --- Events ---
  onDidDisposeEmitter = CreateEventStream();
  onDidDispose = this.onDidDisposeEmitter.Stream.pipe(Stream.toEvent);
  onDidChangeViewStateEmitter = CreateEventStream();
  onDidChangeViewState = this.onDidChangeViewStateEmitter.Stream.pipe(Stream.toEvent);
  webview;
  viewType;
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
  set title(value) {
    if (this._isDisposed || this._title === value) {
      return;
    }
    this._title = value;
    Effect.runFork(
      this.ipcService.SendNotification("$setWebviewTitle", [
        this.handle,
        value
      ])
    );
  }
  get iconPath() {
    return this._iconPath;
  }
  set iconPath(value) {
    if (this._isDisposed || this._iconPath === value) {
      return;
    }
    this._iconPath = value;
    const iconPathDTO = value ? {
      light: value.light ? TypeConverter.URIConverter.FromAPI(
        value.light
      ) : void 0,
      dark: value.dark ? TypeConverter.URIConverter.FromAPI(
        value.dark
      ) : TypeConverter.URIConverter.FromAPI(value)
    } : void 0;
    Effect.runFork(
      this.ipcService.SendNotification("$setWebviewIconPath", [
        this.handle,
        iconPathDTO
      ])
    );
  }
  // --- Public Methods ---
  reveal(viewColumn, preserveFocus) {
    if (this._isDisposed) return;
    const viewColumnDTO = viewColumn ? TypeConverter.ViewColumnConverter.FromAPI(viewColumn) : void 0;
    this.ipcService.SendNotification("$revealWebviewPanel", [
      this.handle,
      viewColumnDTO,
      preserveFocus
    ]);
  }
  dispose() {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.onDidDisposeEmitter.Fire();
    this.onDidDisposeCallback();
    this.webview.dispose();
    Effect.runFork(
      this.ipcService.SendNotification("$disposeWebview", [this.handle])
    );
  }
  // --- Internal Methods ---
  _updateViewState(newState) {
    if (this._isDisposed) return;
    const changed = this._active !== newState.active || this._visible !== newState.visible || this._viewColumn !== newState.viewColumn;
    this._active = newState.active;
    this._visible = newState.visible;
    this._viewColumn = newState.viewColumn;
    if (changed) {
      this.onDidChangeViewStateEmitter.Fire({ webviewPanel: this });
    }
  }
}
export {
  WebViewPanelImplementation
};
//# sourceMappingURL=WebViewPanelImplementation.js.map
